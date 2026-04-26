import type { TimeOfDay } from "./behavior-profile";
import { buildStreakIdentity } from "./streak-identity";

export type PressureNotificationType =
  | "pre-failure-warning"
  | "deadline-pressure"
  | "missed-outcome"
  | "recovery-trigger";

export type PressureNotificationState = {
  lastNotificationSentAt: string | null;
  notificationsSent: {
    preFailure: boolean;
    final: boolean;
    missed: boolean;
    recovery: boolean;
  };
};

export type PressureNotificationDraft = {
  id: number;
  type: PressureNotificationType;
  at: Date;
  title: string;
  body: string;
  commitmentId: string;
  minutesRemaining?: number;
};

type CommitmentLike = {
  id: string;
  actionText: string | null;
  createdAt?: string;
  scheduledDate: string;
  status: "scheduled" | "completed" | "missed";
  proofSubmission?: unknown | null;
  intent: {
    goal?: string;
    text?: string;
  };
  notificationState?: PressureNotificationState | null;
};

type PlannerOptions = {
  now?: number;
  worstTimeOfDay?: TimeOfDay | null;
  lastAppOpenedAt?: number | null;
};

export type LiveConsequenceNotification = {
  id: string;
  type: PressureNotificationType;
  title: string;
  detail: string;
  commitmentId: string;
  minutesRemaining?: number;
};

export type PressureNotificationInspectionItem = {
  notificationId: number;
  commitmentId: string;
  type: PressureNotificationType;
  scheduledAt: string;
  title: string;
  body: string;
  decision: "queued" | "already-sent" | "suppressed" | "not-applicable";
  reason: string;
};

export type PressureNotificationInspection = {
  commitmentId: string;
  actionLabel: string;
  status: CommitmentLike["status"];
  dueAt: string;
  items: PressureNotificationInspectionItem[];
};

const APP_OPEN_STORAGE_KEY = "lockstep_last_app_opened_at_v1";
const MANAGED_ID_BASE = 410_000_000;
const MANAGED_ID_RANGE = 90_000_000;
const MAX_NOTIFICATIONS_PER_DAY = 3;
const MAX_NOTIFICATIONS_PER_PACT = 3;
const COOLDOWN_MINUTES = 20;
const RECOVERY_DELAY_MINUTES = 30;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildNotificationId(commitmentId: string, type: PressureNotificationType) {
  return MANAGED_ID_BASE + (hashString(`${commitmentId}:${type}`) % MANAGED_ID_RANGE);
}

function getActionLabel(commitment: CommitmentLike) {
  return commitment.actionText || commitment.intent.goal || commitment.intent.text || "this pact";
}

function hasProof(commitment: CommitmentLike) {
  return Boolean(commitment.proofSubmission);
}

function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function toMinuteDuration(ms: number) {
  return Math.max(1, Math.round(ms / 60000));
}

function getCreatedAt(commitment: CommitmentLike, dueDate: Date) {
  const parsed = commitment.createdAt ? new Date(commitment.createdAt) : null;
  if (parsed && !Number.isNaN(parsed.getTime()) && parsed.getTime() < dueDate.getTime()) {
    return parsed;
  }

  return new Date(dueDate.getTime() - 6 * 60 * 60 * 1000);
}

function getPreFailureLeadMinutes(totalDurationMinutes: number) {
  return Math.max(35, Math.min(90, Math.round(totalDurationMinutes * 0.25)));
}

function getFinalLeadMinutes(totalDurationMinutes: number) {
  return Math.max(15, Math.min(30, Math.round(totalDurationMinutes * 0.15)));
}

function getDailyKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isTransactional(type: PressureNotificationType) {
  return type === "missed-outcome";
}

function getProactiveCount(state: PressureNotificationState) {
  return [state.notificationsSent.preFailure, state.notificationsSent.final, state.notificationsSent.recovery]
    .filter(Boolean).length;
}

function getCooldownAnchor(state: PressureNotificationState) {
  return state.lastNotificationSentAt ? new Date(state.lastNotificationSentAt).getTime() : null;
}

function setSentFlag(state: PressureNotificationState, type: PressureNotificationType, at: Date) {
  const next: PressureNotificationState = {
    lastNotificationSentAt: state.lastNotificationSentAt,
    notificationsSent: {
      ...state.notificationsSent,
    },
  };

  if (type === "pre-failure-warning") next.notificationsSent.preFailure = true;
  if (type === "deadline-pressure") next.notificationsSent.final = true;
  if (type === "missed-outcome") next.notificationsSent.missed = true;
  if (type === "recovery-trigger") next.notificationsSent.recovery = true;

  if (!isTransactional(type)) {
    next.lastNotificationSentAt = at.toISOString();
  }

  return next;
}

export function createEmptyNotificationState(): PressureNotificationState {
  return {
    lastNotificationSentAt: null,
    notificationsSent: {
      preFailure: false,
      final: false,
      missed: false,
      recovery: false,
    },
  };
}

export function readLastAppOpenedAt() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(APP_OPEN_STORAGE_KEY);
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function markAppOpened() {
  if (typeof window === "undefined") return null;
  const timestamp = Date.now();
  window.localStorage.setItem(APP_OPEN_STORAGE_KEY, String(timestamp));
  return timestamp;
}

function buildVariant(
  type: PressureNotificationType,
  commitment: CommitmentLike,
  options: { worstTimeOfDay?: TimeOfDay | null; commitments: CommitmentLike[] },
) {
  const action = getActionLabel(commitment);
  const streak = buildStreakIdentity(options.commitments).currentStreak;
  const isRiskWindow = options.worstTimeOfDay
    ? getTimeOfDay(new Date(commitment.scheduledDate)) === options.worstTimeOfDay
    : false;

  if (type === "pre-failure-warning") {
    const variants = [
      {
        title: "You're about to miss this.",
        body: "No proof submitted. Consequence is approaching.",
      },
      {
        title: `You said you would: “${action}”`,
        body: "No proof submitted. The window is closing.",
      },
      {
        title: "This is where you usually don't follow through.",
        body: "No proof submitted. Decide before the window closes.",
      },
      {
        title: "Miss this, and your score drops.",
        body: "No proof submitted. Consequence is approaching.",
      },
    ];

    if (isRiskWindow) {
      variants.unshift({
        title: "You usually miss around now.",
        body: `${action} is entering your weak window. Decide now.`,
      });
    }

    return variants[hashString(`${commitment.id}:${type}`) % variants.length];
  }

  if (type === "deadline-pressure") {
    const variants = [
      { title: "30 minutes left.", body: "Proof or consequence." },
      { title: "Last window. Do it or don't.", body: "No explanation left." },
      { title: "This is the moment.", body: "Proof or consequence." },
      {
        title: streak > 0 ? "Break your streak or keep it." : "30 minutes left.",
        body: streak > 0 ? "Decide what happens next." : "Proof or consequence.",
      },
    ];

    return variants[hashString(`${commitment.id}:${type}`) % variants.length];
  }

  if (type === "missed-outcome") {
    const variants = [
      { title: "You didn't do it.", body: "No proof. Outcome logged." },
      { title: "Missed.", body: "No proof. Outcome logged." },
      { title: "Score dropped.", body: "No proof. Outcome logged." },
      { title: "This reinforces your current pattern.", body: "No proof. Outcome logged." },
    ];

    return variants[hashString(`${commitment.id}:${type}`) % variants.length];
  }

  const variants = [
    { title: "Recovery pact ready.", body: "Don't let this stack." },
    { title: "Don't let this stack.", body: "Lock the next pact before avoidance compounds." },
    { title: "One small win fixes this.", body: "Lock a recovery pact now." },
    { title: "Stabilize before this compounds.", body: "Lock a recovery pact now." },
  ];

  return variants[hashString(`${commitment.id}:${type}`) % variants.length];
}

function createDraft(
  commitment: CommitmentLike,
  type: PressureNotificationType,
  at: Date,
  options: { worstTimeOfDay?: TimeOfDay | null; commitments: CommitmentLike[] },
  minutesRemaining?: number,
): PressureNotificationDraft {
  const variant = buildVariant(type, commitment, options);
  return {
    id: buildNotificationId(commitment.id, type),
    type,
    at,
    title: variant.title,
    body: variant.body,
    commitmentId: commitment.id,
    minutesRemaining,
  };
}

function inspectCandidate<T extends CommitmentLike>(
  commitment: T,
  type: PressureNotificationType,
  scheduledAt: Date,
  options: { worstTimeOfDay?: TimeOfDay | null; commitments: T[] },
  state: PressureNotificationState,
  dailyCount: number,
  proactiveCount: number,
  cooldownAnchor: number | null,
  extraReason?: string,
): PressureNotificationInspectionItem {
  const draft = createDraft(commitment, type, scheduledAt, options);

  if (extraReason) {
    return {
      notificationId: draft.id,
      commitmentId: commitment.id,
      type,
      scheduledAt: scheduledAt.toISOString(),
      title: draft.title,
      body: draft.body,
      decision: "not-applicable",
      reason: extraReason,
    };
  }

  if (type === "pre-failure-warning" && state.notificationsSent.preFailure) {
    return {
      notificationId: draft.id,
      commitmentId: commitment.id,
      type,
      scheduledAt: scheduledAt.toISOString(),
      title: draft.title,
      body: draft.body,
      decision: "already-sent",
      reason: "Pre-failure warning already recorded for this pact.",
    };
  }

  if (type === "deadline-pressure" && state.notificationsSent.final) {
    return {
      notificationId: draft.id,
      commitmentId: commitment.id,
      type,
      scheduledAt: scheduledAt.toISOString(),
      title: draft.title,
      body: draft.body,
      decision: "already-sent",
      reason: "Final countdown already recorded for this pact.",
    };
  }

  if (type === "missed-outcome" && state.notificationsSent.missed) {
    return {
      notificationId: draft.id,
      commitmentId: commitment.id,
      type,
      scheduledAt: scheduledAt.toISOString(),
      title: draft.title,
      body: draft.body,
      decision: "already-sent",
      reason: "Missed outcome already recorded for this pact.",
    };
  }

  if (type === "recovery-trigger" && state.notificationsSent.recovery) {
    return {
      notificationId: draft.id,
      commitmentId: commitment.id,
      type,
      scheduledAt: scheduledAt.toISOString(),
      title: draft.title,
      body: draft.body,
      decision: "already-sent",
      reason: "Recovery trigger already recorded for this pact.",
    };
  }

  if (type !== "missed-outcome") {
    if (dailyCount >= MAX_NOTIFICATIONS_PER_DAY) {
      return {
        notificationId: draft.id,
        commitmentId: commitment.id,
        type,
        scheduledAt: scheduledAt.toISOString(),
        title: draft.title,
        body: draft.body,
        decision: "suppressed",
        reason: "Suppressed by maxNotificationsPerDay.",
      };
    }

    if (proactiveCount >= MAX_NOTIFICATIONS_PER_PACT) {
      return {
        notificationId: draft.id,
        commitmentId: commitment.id,
        type,
        scheduledAt: scheduledAt.toISOString(),
        title: draft.title,
        body: draft.body,
        decision: "suppressed",
        reason: "Suppressed by maxNotificationsPerPact.",
      };
    }

    if (cooldownAnchor && scheduledAt.getTime() - cooldownAnchor < COOLDOWN_MINUTES * 60000) {
      return {
        notificationId: draft.id,
        commitmentId: commitment.id,
        type,
        scheduledAt: scheduledAt.toISOString(),
        title: draft.title,
        body: draft.body,
        decision: "suppressed",
        reason: "Suppressed by cooldownBetweenNotifications.",
      };
    }
  }

  return {
    notificationId: draft.id,
    commitmentId: commitment.id,
    type,
    scheduledAt: scheduledAt.toISOString(),
    title: draft.title,
    body: draft.body,
    decision: "queued",
    reason: "Eligible under current timing and throttling rules.",
  };
}

export function planPressureNotifications<T extends CommitmentLike>(
  commitments: T[],
  options: PlannerOptions = {},
): { notifications: PressureNotificationDraft[]; updatedCommitments: T[] } {
  const now = options.now ?? Date.now();
  const nowDate = new Date(now);
  const candidates: Array<{ index: number; draft: PressureNotificationDraft }> = [];
  const updatedCommitments = commitments.map((commitment) => {
    const state = commitment.notificationState ?? createEmptyNotificationState();
    return {
      ...commitment,
      notificationState: {
        lastNotificationSentAt: state.lastNotificationSentAt,
        notificationsSent: { ...state.notificationsSent },
      },
    };
  });

  for (let index = 0; index < updatedCommitments.length; index += 1) {
    const commitment = updatedCommitments[index];
    const dueDate = new Date(commitment.scheduledDate);
    if (Number.isNaN(dueDate.getTime())) continue;
    if (commitment.status === "completed" || hasProof(commitment)) continue;

    const createdAt = getCreatedAt(commitment, dueDate);
    const totalDurationMinutes = toMinuteDuration(dueDate.getTime() - createdAt.getTime());
    const preLead = getPreFailureLeadMinutes(totalDurationMinutes);
    const finalLead = getFinalLeadMinutes(totalDurationMinutes);
    const preAt = new Date(dueDate.getTime() - preLead * 60000);
    const finalAt = new Date(dueDate.getTime() - finalLead * 60000);
    const missedAt = new Date(dueDate.getTime() + 60 * 1000);
    const recoveryAt = new Date(dueDate.getTime() + RECOVERY_DELAY_MINUTES * 60000);
    const state = commitment.notificationState ?? createEmptyNotificationState();
    const hasFuturePact = updatedCommitments.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.status === "scheduled" &&
        new Date(candidate.scheduledDate).getTime() > dueDate.getTime(),
    );
    const openedAfterMiss = options.lastAppOpenedAt ? options.lastAppOpenedAt >= dueDate.getTime() : false;

    if (commitment.status === "scheduled" && !state.notificationsSent.preFailure && preAt.getTime() > nowDate.getTime()) {
      candidates.push({
        index,
        draft: createDraft(commitment, "pre-failure-warning", preAt, { worstTimeOfDay: options.worstTimeOfDay, commitments }, preLead),
      });
    }

    if (commitment.status === "scheduled" && !state.notificationsSent.final && finalAt.getTime() > nowDate.getTime()) {
      candidates.push({
        index,
        draft: createDraft(commitment, "deadline-pressure", finalAt, { worstTimeOfDay: options.worstTimeOfDay, commitments }, finalLead),
      });
    }

    if (commitment.status === "scheduled" && !state.notificationsSent.missed && missedAt.getTime() > nowDate.getTime()) {
      candidates.push({
        index,
        draft: createDraft(commitment, "missed-outcome", missedAt, { worstTimeOfDay: options.worstTimeOfDay, commitments }),
      });
    }

    if (!state.notificationsSent.recovery && !hasFuturePact && !openedAfterMiss && recoveryAt.getTime() > nowDate.getTime()) {
      candidates.push({
        index,
        draft: createDraft(commitment, "recovery-trigger", recoveryAt, { worstTimeOfDay: options.worstTimeOfDay, commitments }),
      });
    }
  }

  candidates.sort((a, b) => {
    const timeDiff = a.draft.at.getTime() - b.draft.at.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.draft.id - b.draft.id;
  });

  const dailyCounts = new Map<string, number>();
  const accepted: PressureNotificationDraft[] = [];

  for (const candidate of candidates) {
    const commitment = updatedCommitments[candidate.index];
    const state = commitment.notificationState ?? createEmptyNotificationState();
    const dailyKey = getDailyKey(candidate.draft.at);
    const dailyCount = dailyCounts.get(dailyKey) ?? 0;
    const proactiveCount = getProactiveCount(state);
    const cooldownAnchor = getCooldownAnchor(state);

    if (!isTransactional(candidate.draft.type)) {
      if (dailyCount >= MAX_NOTIFICATIONS_PER_DAY) continue;
      if (proactiveCount >= MAX_NOTIFICATIONS_PER_PACT) continue;
      if (cooldownAnchor && candidate.draft.at.getTime() - cooldownAnchor < COOLDOWN_MINUTES * 60000) continue;
    }

    commitment.notificationState = setSentFlag(state, candidate.draft.type, candidate.draft.at);
    accepted.push(candidate.draft);

    if (!isTransactional(candidate.draft.type)) {
      dailyCounts.set(dailyKey, dailyCount + 1);
    }
  }

  return {
    notifications: accepted,
    updatedCommitments,
  };
}

export function buildLivePressureNotifications<T extends CommitmentLike>(
  commitments: T[],
  options: PlannerOptions = {},
): LiveConsequenceNotification[] {
  const now = options.now ?? Date.now();
  const nowDate = new Date(now);
  const notifications: LiveConsequenceNotification[] = [];
  const streak = buildStreakIdentity(commitments).currentStreak;

  for (const commitment of commitments) {
    if (commitment.status === "completed" || hasProof(commitment)) continue;

    const dueDate = new Date(commitment.scheduledDate);
    if (Number.isNaN(dueDate.getTime())) continue;

    const createdAt = getCreatedAt(commitment, dueDate);
    const totalDurationMinutes = toMinuteDuration(dueDate.getTime() - createdAt.getTime());
    const preLead = getPreFailureLeadMinutes(totalDurationMinutes);
    const finalLead = getFinalLeadMinutes(totalDurationMinutes);
    const minutesRemaining = Math.floor((dueDate.getTime() - nowDate.getTime()) / 60000);
    const hasFuturePact = commitments.some(
      (candidate) =>
        candidate.id !== commitment.id &&
        candidate.status === "scheduled" &&
        new Date(candidate.scheduledDate).getTime() > dueDate.getTime(),
    );

    if (commitment.status === "scheduled" && minutesRemaining <= preLead && minutesRemaining > finalLead) {
      const variant = buildVariant("pre-failure-warning", commitment, { worstTimeOfDay: options.worstTimeOfDay, commitments });
      notifications.push({
        id: `live-prefail-${commitment.id}`,
        type: "pre-failure-warning",
        title: variant.title,
        detail: variant.body,
        commitmentId: commitment.id,
        minutesRemaining,
      });
      continue;
    }

    if (commitment.status === "scheduled" && minutesRemaining <= finalLead && minutesRemaining > 0) {
      const variant = buildVariant("deadline-pressure", commitment, { worstTimeOfDay: options.worstTimeOfDay, commitments });
      notifications.push({
        id: `live-final-${commitment.id}`,
        type: "deadline-pressure",
        title: streak > 0 && variant.title === "Break your streak or keep it." ? variant.title : variant.title,
        detail: variant.body,
        commitmentId: commitment.id,
        minutesRemaining,
      });
      continue;
    }

    if (minutesRemaining <= 0) {
      const missedVariant = buildVariant("missed-outcome", commitment, { worstTimeOfDay: options.worstTimeOfDay, commitments });
      notifications.push({
        id: `live-missed-${commitment.id}`,
        type: "missed-outcome",
        title: missedVariant.title,
        detail: missedVariant.body,
        commitmentId: commitment.id,
      });

      if (!hasFuturePact) {
        const recoveryVariant = buildVariant("recovery-trigger", commitment, { worstTimeOfDay: options.worstTimeOfDay, commitments });
        notifications.push({
          id: `live-recovery-${commitment.id}`,
          type: "recovery-trigger",
          title: recoveryVariant.title,
          detail: recoveryVariant.body,
          commitmentId: commitment.id,
        });
      }
    }
  }

  return notifications;
}

export function inspectPressureNotifications<T extends CommitmentLike>(
  commitments: T[],
  options: PlannerOptions = {},
): PressureNotificationInspection[] {
  const now = options.now ?? Date.now();
  const inspections: PressureNotificationInspection[] = [];
  const dailyCounts = new Map<string, number>();

  for (const commitment of commitments) {
    const dueDate = new Date(commitment.scheduledDate);
    if (Number.isNaN(dueDate.getTime())) {
      inspections.push({
        commitmentId: commitment.id,
        actionLabel: getActionLabel(commitment),
        status: commitment.status,
        dueAt: commitment.scheduledDate,
        items: [
          {
            notificationId: -1,
            commitmentId: commitment.id,
            type: "pre-failure-warning",
            scheduledAt: commitment.scheduledDate,
            title: "Invalid deadline",
            body: "",
            decision: "not-applicable",
            reason: "Commitment scheduledDate is invalid.",
          },
        ],
      });
      continue;
    }

    const createdAt = getCreatedAt(commitment, dueDate);
    const totalDurationMinutes = toMinuteDuration(dueDate.getTime() - createdAt.getTime());
    const preLead = getPreFailureLeadMinutes(totalDurationMinutes);
    const finalLead = getFinalLeadMinutes(totalDurationMinutes);
    const state = commitment.notificationState ?? createEmptyNotificationState();
    const proactiveCount = getProactiveCount(state);
    const cooldownAnchor = getCooldownAnchor(state);
    const hasFuturePact = commitments.some(
      (candidate) =>
        candidate.id !== commitment.id &&
        candidate.status === "scheduled" &&
        new Date(candidate.scheduledDate).getTime() > dueDate.getTime(),
    );
    const openedAfterMiss = options.lastAppOpenedAt ? options.lastAppOpenedAt >= dueDate.getTime() : false;
    const dailyKey = getDailyKey(dueDate);
    const dailyCount = dailyCounts.get(dailyKey) ?? 0;

    const items: PressureNotificationInspectionItem[] = [];

    const baseNotApplicableReason =
      commitment.status === "completed"
        ? "Commitment already completed. Silence after completion."
        : hasProof(commitment)
          ? "Proof already submitted. No pressure notification should send."
          : undefined;

    items.push(
      inspectCandidate(
        commitment,
        "pre-failure-warning",
        new Date(dueDate.getTime() - preLead * 60000),
        { worstTimeOfDay: options.worstTimeOfDay, commitments },
        state,
        dailyCount,
        proactiveCount,
        cooldownAnchor,
        baseNotApplicableReason,
      ),
    );

    items.push(
      inspectCandidate(
        commitment,
        "deadline-pressure",
        new Date(dueDate.getTime() - finalLead * 60000),
        { worstTimeOfDay: options.worstTimeOfDay, commitments },
        state,
        dailyCount,
        proactiveCount,
        cooldownAnchor,
        baseNotApplicableReason,
      ),
    );

    items.push(
      inspectCandidate(
        commitment,
        "missed-outcome",
        new Date(dueDate.getTime() + 60 * 1000),
        { worstTimeOfDay: options.worstTimeOfDay, commitments },
        state,
        dailyCount,
        proactiveCount,
        cooldownAnchor,
        baseNotApplicableReason,
      ),
    );

    items.push(
      inspectCandidate(
        commitment,
        "recovery-trigger",
        new Date(dueDate.getTime() + RECOVERY_DELAY_MINUTES * 60000),
        { worstTimeOfDay: options.worstTimeOfDay, commitments },
        state,
        dailyCount,
        proactiveCount,
        cooldownAnchor,
        baseNotApplicableReason
          ?? (hasFuturePact
            ? "Another future pact exists, so recovery trigger is withheld."
            : openedAfterMiss
              ? "User opened the app after the miss, so recovery trigger is withheld."
              : undefined),
      ),
    );

    items.forEach((item) => {
      if (item.decision === "queued" && item.type !== "missed-outcome") {
        dailyCounts.set(dailyKey, (dailyCounts.get(dailyKey) ?? 0) + 1);
      }
    });

    inspections.push({
      commitmentId: commitment.id,
      actionLabel: getActionLabel(commitment),
      status: commitment.status,
      dueAt: commitment.scheduledDate,
      items,
    });
  }

  return inspections;
}