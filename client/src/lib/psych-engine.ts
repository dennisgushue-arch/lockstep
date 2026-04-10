export type BehaviorMemoryLike = {
  summary?: {
    strongestCategory?: string | null;
    weakestCategory?: string | null;
    bestTimeOfDay?: "morning" | "afternoon" | "evening" | "unknown";
    worstTimeOfDay?: "morning" | "afternoon" | "evening" | "unknown";
    commonFailureReason?: string | null;
    bluffTopics?: string[];
  };
  raw?: {
    completionRate?: number;
    totalCompleted?: number;
    totalMissed?: number;
    categoryRates?: Record<string, number>;
    timeRates?: Record<string, number>;
    failureReasonCounts?: Record<string, number>;
  };
  insights?: string[];
};

export type CommitmentLike = {
  status: "scheduled" | "completed" | "missed";
  scheduledDate: string;
  intent?: {
    parsed_intent?: {
      category?: string;
    };
    category?: string;
  };
  failureReason?: string | null;
};

export type PsychProfile = {
  generatedAt: string;
  pattern_warning: string;
  best_leverage_point: string;
  identity_risk: string;
  next_pressure_line: string;
};

function getActiveCategory(commitments: CommitmentLike[]) {
  const active = commitments
    .filter((c) => c.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    )[0];

  return active?.intent?.parsed_intent?.category || active?.intent?.category || null;
}

export function buildPsychProfile(input: {
  behaviorMemory: BehaviorMemoryLike | null;
  commitments: CommitmentLike[];
  integrityScore: number;
}): PsychProfile {
  const { behaviorMemory, commitments, integrityScore } = input;

  const strongestCategory = behaviorMemory?.summary?.strongestCategory || null;
  const weakestCategory = behaviorMemory?.summary?.weakestCategory || null;
  const bestTimeOfDay = behaviorMemory?.summary?.bestTimeOfDay || "unknown";
  const worstTimeOfDay = behaviorMemory?.summary?.worstTimeOfDay || "unknown";
  const commonFailureReason = behaviorMemory?.summary?.commonFailureReason || null;
  const bluffTopics = behaviorMemory?.summary?.bluffTopics || [];
  const completionRate = behaviorMemory?.raw?.completionRate ?? 0;
  const totalMissed = behaviorMemory?.raw?.totalMissed ?? 0;

  const activeCategory = getActiveCategory(commitments);

  let pattern_warning = "Your behavior pattern is still forming.";
  let best_leverage_point = "Keep the pact small and visible.";
  let identity_risk = "Your word is still unstable.";
  let next_pressure_line = "Do not leave this to the last hour.";

  if (commonFailureReason === "Forgot") {
    pattern_warning = "You do not usually fail from effort. You fail from drift.";
  } else if (commonFailureReason === "Low energy") {
    pattern_warning = "Energy drop is one of your repeat failure patterns.";
  } else if (commonFailureReason === "Unclear plan") {
    pattern_warning = "You fail when the first step is not obvious.";
  } else if (commonFailureReason === "Avoided discomfort") {
    pattern_warning = "You tend to avoid the pact when discomfort is built in.";
  } else if (worstTimeOfDay !== "unknown") {
    pattern_warning = `Your follow-through weakens in the ${worstTimeOfDay}.`;
  } else if (weakestCategory) {
    pattern_warning = `You are weakest when the pact falls in ${weakestCategory}.`;
  }

  if (bestTimeOfDay !== "unknown") {
    best_leverage_point = `Your best follow-through happens in the ${bestTimeOfDay}.`;
  }

  if (
    strongestCategory &&
    activeCategory &&
    strongestCategory.toLowerCase() === activeCategory.toLowerCase()
  ) {
    best_leverage_point = `This sits in one of your stronger categories: ${strongestCategory}.`;
  } else if (
    weakestCategory &&
    activeCategory &&
    weakestCategory.toLowerCase() === activeCategory.toLowerCase()
  ) {
    best_leverage_point = `This sits in one of your weaker categories: ${weakestCategory}. Keep it narrower than usual.`;
  }

  if (integrityScore >= 80 && completionRate >= 0.75) {
    identity_risk = "You are becoming reliable. A miss here breaks that pattern.";
  } else if (integrityScore >= 60) {
    identity_risk = "You can follow through, but not consistently enough yet.";
  } else if (integrityScore >= 40) {
    identity_risk = "You are building a pattern of non-follow-through.";
  } else {
    identity_risk = "Your word is slipping. Another miss reinforces it.";
  }

  if (totalMissed >= 5) {
    next_pressure_line = "You have enough evidence. Start before avoidance takes over.";
  } else if (bluffTopics.length > 0) {
    next_pressure_line = `You keep talking about ${bluffTopics[0]}. Make this the moment it becomes real.`;
  } else if (commonFailureReason === "Unclear plan") {
    next_pressure_line = "Do the first visible step now. Do not wait for motivation.";
  } else if (commonFailureReason === "Avoided discomfort") {
    next_pressure_line = "The discomfort does not go away by waiting.";
  }

  return {
    generatedAt: new Date().toISOString(),
    pattern_warning,
    best_leverage_point,
    identity_risk,
    next_pressure_line,
  };
}
