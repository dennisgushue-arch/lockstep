type Commitment = {
  status: "scheduled" | "completed" | "missed";
  scheduledDate: string;
  actionText?: string | null;
  action_text?: string | null;
  intent?: {
    parsed_intent?: {
      category?: string;
    };
  };
};

export type RealityFeedback = {
  headline: string;
  truth: string;
  pattern: string;
  nextMove: string;
  severity: "good" | "warning" | "critical";
};

function withinDays(date: string, days: number) {
  const time = new Date(date).getTime();
  return time >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function mostCommon(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function buildRealityFeedback(commitments: Commitment[]): RealityFeedback {
  const recent = commitments.filter((c) => withinDays(c.scheduledDate, 7));
  const completed = recent.filter((c) => c.status === "completed");
  const missed = recent.filter((c) => c.status === "missed");
  const scheduled = commitments.filter((c) => c.status === "scheduled");

  if (commitments.length === 0) {
    return {
      headline: "Nothing proven yet.",
      truth: "You have not created a pact.",
      pattern: "No pattern exists until you put something on the line.",
      nextMove: "Create one small pact today.",
      severity: "warning",
    };
  }

  if (scheduled.length > 0 && completed.length === 0 && missed.length === 0) {
    return {
      headline: "The outcome is still open.",
      truth: "You have an active pact, but no result yet.",
      pattern: "This is where intention either turns into action or disappears.",
      nextMove: "Start before the final hour.",
      severity: "warning",
    };
  }

  const totalResolved = completed.length + missed.length;
  const completionRate =
    totalResolved === 0 ? 0 : Math.round((completed.length / totalResolved) * 100);

  const missedCategories = missed
    .map((c) => c.intent?.parsed_intent?.category || "unknown")
    .filter(Boolean);

  const weakestCategory = mostCommon(missedCategories);

  if (missed.length > completed.length) {
    return {
      headline: "Momentum is slipping.",
      truth: `You kept ${completed.length}/${totalResolved} pacts this week.`,
      pattern: weakestCategory
        ? `Your misses are clustering around ${weakestCategory}.`
        : "Your misses are starting to stack.",
      nextMove: "Shrink the next pact and complete one clean win today.",
      severity: "critical",
    };
  }

  if (completionRate < 70) {
    return {
      headline: "You are inconsistent.",
      truth: `Your follow-through rate this week is ${completionRate}%.`,
      pattern: weakestCategory
        ? `${weakestCategory} is currently your weak point.`
        : "The pattern is not stable yet.",
      nextMove: "Choose one smaller pact with a same-day deadline.",
      severity: "warning",
    };
  }

  return {
    headline: "Momentum is holding.",
    truth: `You kept ${completed.length}/${totalResolved} pacts this week.`,
    pattern: "Your current pattern is moving in the right direction.",
    nextMove: "Protect the next pact. Do not overexpand.",
    severity: "good",
  };
}
