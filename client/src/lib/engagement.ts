import { buildStreakIdentity } from "@/lib/streak-identity";
import type { Commitment } from "@/lib/mock-data";
import { buildLivePressureNotifications } from "@/lib/pressure-notifications";

export type ConsequenceNotificationType =
  | "pre-failure-warning"
  | "deadline-pressure"
  | "missed-outcome"
  | "recovery-trigger"
  | "day-2-trigger";

export type ConsequenceNotification = {
  id: string;
  type: ConsequenceNotificationType;
  title: string;
  detail: string;
  commitmentId?: string;
  minutesRemaining?: number;
};

export type ReviewPromptType = "first-completion" | "streak-shift" | "recovery-success";

export type ReviewPrompt = {
  type: ReviewPromptType;
  title: string;
  body: string;
  cta: string;
};

const FIRST_WIN_DEADLINE_HOURS = 2;
const FIRST_WIN_CREDITS = 10;

export function buildConsequenceNotifications(
  commitments: Commitment[],
  options?: { now?: number; worstTimeOfDay?: "morning" | "afternoon" | "evening" | "night" | null },
): ConsequenceNotification[] {
  return buildLivePressureNotifications(commitments, options).map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    detail: notification.detail,
    commitmentId: notification.commitmentId,
    minutesRemaining: notification.minutesRemaining,
  }));
}

export function getFirstPactDefaults(currentIntentDeadline?: string | null) {
  const now = new Date();
  const fallback = new Date(now.getTime() + FIRST_WIN_DEADLINE_HOURS * 60 * 60 * 1000);
  const parsed = currentIntentDeadline ? new Date(currentIntentDeadline) : null;

  const deadline = parsed && !Number.isNaN(parsed.getTime())
    ? new Date(Math.min(parsed.getTime(), fallback.getTime()))
    : fallback;

  return {
    deadline,
    creditsCost: FIRST_WIN_CREDITS,
    stakeLabel: `${FIRST_WIN_CREDITS} credits`,
  };
}

export function getReviewPrompt(commitments: Commitment[], dismissedTypes: ReviewPromptType[] = []): ReviewPrompt | null {
  const completed = commitments.filter((commitment) => commitment.status === "completed");
  const missed = commitments.filter((commitment) => commitment.status === "missed");
  const streak = buildStreakIdentity(commitments);

  if (completed.length >= 1 && !dismissedTypes.includes("first-completion")) {
    return {
      type: "first-completion",
      title: "You followed through. Most people don't.",
      body: "If Lockstep helped make this happen, rate it now.",
      cta: "Rate Lockstep",
    };
  }

  if (streak.currentStreak >= 2 && !dismissedTypes.includes("streak-shift")) {
    return {
      type: "streak-shift",
      title: "Your word is starting to mean something.",
      body: "If this streak feels real, leave a quick review.",
      cta: "Rate progress",
    };
  }

  if (missed.length > 0 && completed.length > 0 && !dismissedTypes.includes("recovery-success")) {
    const latestMiss = [...missed].sort(
      (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime(),
    )[0];
    const completionAfterMiss = completed.some(
      (commitment) => new Date(commitment.scheduledDate).getTime() > new Date(latestMiss.scheduledDate).getTime(),
    );

    if (completionAfterMiss) {
      return {
        type: "recovery-success",
        title: "You didn't quit. That matters.",
        body: "If Lockstep helped you recover, rate it.",
        cta: "Rate recovery",
      };
    }
  }

  return null;
}
