import type { IntentPattern, IntentSignal } from "./passive-detection";

export interface BehaviorPsychInsights {
  pattern_warning: string;
  best_leverage_point: string;
  identity_risk: string;
  next_pressure_line: string;
}

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface UserBehaviorProfile {
  version: "v1";
  generated_at: string;
  // Flat convenience fields
  completionRate: number;
  strongestCategory: string | null;
  weakestCategory: string | null;
  bestTimeOfDay: TimeOfDay | null;
  worstTimeOfDay: TimeOfDay | null;
  commonFailureReason: string;
  bluffTopics: string[];
  riskPatterns: string[];
  identitySummary: string[];
  // Nested data
  stats: {
    total_commitments: number;
    completed_commitments: number;
    missed_commitments: number;
    active_commitments: number;
    completion_rate: number;
    active_overdue_count: number;
    average_stake: number;
  };
  categories: Array<{
    category: string;
    total: number;
    completion_rate: number;
  }>;
  repeated_patterns: Array<{
    intent: string;
    mentions: number;
    day_span: number;
  }>;
  psych: BehaviorPsychInsights;
}

export type BehaviorCommitment = {
  id: string;
  status: "scheduled" | "completed" | "missed";
  scheduledDate: string;
  creditsCost?: number;
  intent?: {
    category?: string;
    text?: string;
    goal?: string;
  } | null;
};

type BuildProfileInput = {
  commitments: BehaviorCommitment[];
  intentPatterns: IntentPattern[];
  intentSignals: IntentSignal[];
  currentIntentText?: string;
  now?: Date;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getTimeOfDay(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function deriveBestWorstTimeOfDay(
  commitments: BehaviorCommitment[]
): { best: TimeOfDay | null; worst: TimeOfDay | null } {
  const buckets: Record<TimeOfDay, { completed: number; missed: number }> = {
    morning: { completed: 0, missed: 0 },
    afternoon: { completed: 0, missed: 0 },
    evening: { completed: 0, missed: 0 },
    night: { completed: 0, missed: 0 },
  };

  for (const c of commitments) {
    if (c.status === "completed" || c.status === "missed") {
      const tod = getTimeOfDay(new Date(c.scheduledDate));
      if (c.status === "completed") buckets[tod].completed += 1;
      else buckets[tod].missed += 1;
    }
  }

  const times: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];
  let best: TimeOfDay | null = null;
  let worst: TimeOfDay | null = null;
  let bestScore = -1;
  let worstScore = -1;

  for (const tod of times) {
    const { completed, missed } = buckets[tod];
    if (completed + missed === 0) continue;
    const rate = completed / (completed + missed);
    if (rate > bestScore) {
      bestScore = rate;
      best = tod;
    }
    if (missed > worstScore) {
      worstScore = missed;
      worst = tod;
    }
  }

  return { best, worst };
}

function deriveBluffTopics(intentPatterns: IntentPattern[]): string[] {
  return intentPatterns
    .filter((p) => p.occurrenceCount >= 2 && p.status !== "locked" && p.status !== "dismissed")
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, 4)
    .map((p) => p.normalizedIntent);
}

function deriveRiskPatterns(
  stats: UserBehaviorProfile["stats"],
  bluffTopics: string[],
  worstTimeOfDay: TimeOfDay | null
): string[] {
  const risks: string[] = [];
  if (stats.active_overdue_count >= 2) risks.push("overdue accumulation");
  if (bluffTopics.length >= 2) risks.push("bluff cycling — repeated intent without commitment");
  if (stats.completion_rate < 0.4 && stats.total_commitments >= 3) risks.push("systematic follow-through failure");
  if (worstTimeOfDay) risks.push(`${worstTimeOfDay} scheduling failure zone`);
  if (stats.missed_commitments > stats.completed_commitments && stats.total_commitments >= 4) {
    risks.push("failure majority — misses outnumber completions");
  }
  return risks.length > 0 ? risks : ["soft starts — intent without urgency anchor"];
}

function deriveCommonFailureReason(
  stats: UserBehaviorProfile["stats"],
  topRepeated: { intent: string; mentions: number } | null,
  weakestCategory: string | null
): string {
  if (stats.active_overdue_count >= 2) {
    return "deadline drift — active commitments pile up without resolution";
  }
  if (topRepeated && topRepeated.mentions >= 3) {
    return `repetition trap — "${topRepeated.intent}" keeps cycling without conversion`;
  }
  if (stats.missed_commitments > stats.completed_commitments && stats.total_commitments >= 3) {
    return weakestCategory
      ? `under-execution in ${weakestCategory} category — pattern of intention over action`
      : "under-execution pattern — promises made faster than they're kept";
  }
  if (stats.total_commitments < 3) {
    return "insufficient data — initial velocity matters, set two more pacts now";
  }
  return "unclear closure signals — completion not anchored to a clear proof moment";
}

function deriveIdentitySummary(
  stats: UserBehaviorProfile["stats"],
  strongestCategory: string | null,
  weakestCategory: string | null,
  bluffTopics: string[],
  bestTimeOfDay: TimeOfDay | null
): string[] {
  const lines: string[] = [];

  if (stats.total_commitments === 0) {
    return [
      "Identity in pre-formation — no pacts, no pattern.",
      "First commitment defines the starting character.",
    ];
  }

  const rate = stats.completion_rate;
  if (rate >= 0.8) {
    lines.push(`High-integrity executor: ${Math.round(rate * 100)}% completion rate.`);
  } else if (rate >= 0.5) {
    lines.push(`Moderate executor: completes ${Math.round(rate * 100)}% of pacts — room to sharpen.`);
  } else {
    lines.push(`Under-delivering: only ${Math.round(rate * 100)}% follow-through — self-trust is eroding.`);
  }

  if (strongestCategory) {
    lines.push(`Strongest in ${strongestCategory} — this is your execution home base.`);
  }
  if (weakestCategory && weakestCategory !== strongestCategory) {
    lines.push(`Core tension: ${weakestCategory} is where resolve consistently breaks down.`);
  }

  if (bluffTopics.length >= 2) {
    lines.push(`Bluff pattern active: ${bluffTopics.slice(0, 2).join(", ")} flagged repeatedly without lock-in.`);
  }

  if (bestTimeOfDay && stats.completed_commitments >= 2) {
    lines.push(`Peak execution window: ${bestTimeOfDay}. Schedule hard commitments then.`);
  }

  return lines.slice(0, 4);
}

function buildPsychInsights(
  stats: UserBehaviorProfile["stats"],
  categories: UserBehaviorProfile["categories"],
  repeatedPatterns: UserBehaviorProfile["repeated_patterns"],
  bluffTopics: string[],
  worstTimeOfDay: TimeOfDay | null,
  currentIntentText?: string
): BehaviorPsychInsights {
  const weakCategory = categories
    .filter((c) => c.total >= 2)
    .sort((a, b) => a.completion_rate - b.completion_rate)[0];

  const strongCategory = categories
    .filter((c) => c.total >= 2)
    .sort((a, b) => b.completion_rate - a.completion_rate)[0];

  const topRepeated = repeatedPatterns.sort((a, b) => b.mentions - a.mentions)[0];

  const bluffNote = bluffTopics.length >= 2
    ? ` Bluff topics detected: ${bluffTopics.slice(0, 2).join(", ")}.`
    : "";

  const pattern_warning = topRepeated && topRepeated.mentions >= 3
    ? `You have stated "${topRepeated.intent}" ${topRepeated.mentions} times over ${topRepeated.day_span} days without a locked pact.${bluffNote} That cycle is your drift pattern.`
    : stats.active_overdue_count > 0
      ? `You currently have ${stats.active_overdue_count} overdue commitment${stats.active_overdue_count === 1 ? "" : "s"}. Delay is becoming the default.${bluffNote}`
      : bluffTopics.length >= 1
        ? `Unanchored topic detected: "${bluffTopics[0]}". Stated repeatedly, never staked. Lock it in or drop it.`
        : "Your risk pattern is soft starts. Convert intention to one visible action inside 24 hours.";

  const best_leverage_point = strongCategory
    ? `Your best execution lane is ${strongCategory.category} (${Math.round(
        strongCategory.completion_rate * 100
      )}% completion). Anchor new pacts to that same structure and context.`
    : "Your leverage point is specificity: one action, one deadline, one proof signal.";

  const identity_risk = stats.total_commitments < 3
    ? "Your identity risk is inconsistency during startup. Early misses can define your story if you let them."
    : stats.completion_rate < 0.45
      ? `Your current completion rate is ${Math.round(
          stats.completion_rate * 100
        )}%. At this trajectory, you train yourself to distrust your own promises.${
          worstTimeOfDay ? ` Your failure zone is ${worstTimeOfDay} — avoid scheduling hard commitments then.` : ""
        }`
      : weakCategory
        ? `Your weakest lane is ${weakCategory.category}. This is where self-trust erodes first — address it directly or accept the narrative.`
        : "Your identity risk is complacency after wins. Keep consequence pressure consistent.";

  const intentStub = currentIntentText?.trim() || "this commitment";
  const next_pressure_line = stats.completion_rate < 0.5
    ? `For ${intentStub}: reduce scope by 30%, raise the stake, and require proof by end-of-day. Small wins are non-negotiable right now.`
    : `For ${intentStub}: lock the first action to a specific hour and require one visible proof signal before midnight.`;

  return {
    pattern_warning,
    best_leverage_point,
    identity_risk,
    next_pressure_line,
  };
}

export function buildUserBehaviorProfile({
  commitments,
  intentPatterns,
  intentSignals,
  currentIntentText,
  now = new Date(),
}: BuildProfileInput): UserBehaviorProfile {
  const total_commitments = commitments.length;
  const completed_commitments = commitments.filter((c) => c.status === "completed").length;
  const missed_commitments = commitments.filter((c) => c.status === "missed").length;
  const active_commitments = commitments.filter((c) => c.status === "scheduled").length;
  const active_overdue_count = commitments.filter(
    (c) => c.status === "scheduled" && new Date(c.scheduledDate).getTime() < now.getTime()
  ).length;

  const completion_rate = total_commitments > 0 ? clamp01(completed_commitments / total_commitments) : 0;

  const average_stake = total_commitments > 0
    ? commitments.reduce((sum, c) => sum + (c.creditsCost ?? 0), 0) / total_commitments
    : 0;

  const categoryMap: Record<string, { total: number; completed: number }> = {};
  commitments.forEach((c) => {
    const category = c.intent?.category || "other";
    if (!categoryMap[category]) {
      categoryMap[category] = { total: 0, completed: 0 };
    }
    categoryMap[category].total += 1;
    if (c.status === "completed") {
      categoryMap[category].completed += 1;
    }
  });

  const categories = Object.entries(categoryMap)
    .map(([category, values]) => ({
      category,
      total: values.total,
      completion_rate: values.total > 0 ? round2(values.completed / values.total) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const repeated_patterns = intentPatterns
    .map((p) => ({
      intent: p.normalizedIntent,
      mentions: p.occurrenceCount,
      day_span: p.daySpan,
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);

  const stats = {
    total_commitments,
    completed_commitments,
    missed_commitments,
    active_commitments,
    completion_rate: round2(completion_rate),
    active_overdue_count,
    average_stake: round2(average_stake),
  };

  // Derive richer fields
  const sortedByCompletion = [...categories].sort((a, b) => b.completion_rate - a.completion_rate);
  const sortedByCompletionAsc = [...categories].sort((a, b) => a.completion_rate - b.completion_rate);
  const strongestCategoryObj = sortedByCompletion.find((c) => c.total >= 2) ?? null;
  const weakestCategoryObj = sortedByCompletionAsc.find((c) => c.total >= 2) ?? null;
  const strongestCategory = strongestCategoryObj?.category ?? null;
  const weakestCategory = weakestCategoryObj?.category ?? null;

  const { best: bestTimeOfDay, worst: worstTimeOfDay } = deriveBestWorstTimeOfDay(commitments);

  const bluffTopics = deriveBluffTopics(intentPatterns);
  const riskPatterns = deriveRiskPatterns(stats, bluffTopics, worstTimeOfDay);

  const topRepeated = repeated_patterns[0] ?? null;
  const commonFailureReason = deriveCommonFailureReason(stats, topRepeated, weakestCategory);
  const identitySummary = deriveIdentitySummary(stats, strongestCategory, weakestCategory, bluffTopics, bestTimeOfDay);

  const hasData = intentSignals.length > 0 || total_commitments > 0;

  if (!hasData) {
    return {
      version: "v1",
      generated_at: new Date().toISOString(),
      completionRate: 0,
      strongestCategory: null,
      weakestCategory: null,
      bestTimeOfDay: null,
      worstTimeOfDay: null,
      commonFailureReason: "no data yet",
      bluffTopics: [],
      riskPatterns: ["no history — first commitment defines the baseline"],
      identitySummary: [
        "Identity in pre-formation — no pacts, no pattern.",
        "First commitment defines the starting character.",
      ],
      stats,
      categories,
      repeated_patterns,
      psych: {
        pattern_warning: "No behavior history yet. Start with one pact you can prove today.",
        best_leverage_point: "Leverage comes from consistency: one small win, repeated.",
        identity_risk: "Without a record, identity defaults to intention-only mode.",
        next_pressure_line: currentIntentText
          ? `For ${currentIntentText.trim()}, define one proof and one deadline now.`
          : "Define one proof and one deadline now.",
      },
    };
  }

  const psych = buildPsychInsights(
    stats,
    categories,
    repeated_patterns,
    bluffTopics,
    worstTimeOfDay,
    currentIntentText
  );

  return {
    version: "v1",
    generated_at: new Date().toISOString(),
    completionRate: round2(completion_rate),
    strongestCategory,
    weakestCategory,
    bestTimeOfDay,
    worstTimeOfDay,
    commonFailureReason,
    bluffTopics,
    riskPatterns,
    identitySummary,
    stats,
    categories,
    repeated_patterns,
    psych,
  };
}

function safeParseArray(value: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hydrateBehaviorProfileFromLocalStorage(currentIntentText?: string): UserBehaviorProfile | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  const commitments = safeParseArray(localStorage.getItem("intent_mock_commitments")) as BehaviorCommitment[];
  const intentPatterns = safeParseArray(localStorage.getItem("intent_mock_patterns")) as IntentPattern[];
  const intentSignals = safeParseArray(localStorage.getItem("intent_mock_signals")) as IntentSignal[];

  return buildUserBehaviorProfile({
    commitments,
    intentPatterns,
    intentSignals,
    currentIntentText,
  });
}