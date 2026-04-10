type AdaptivePactSizeInput = {
  action: string;
  category: string;
  difficulty: number;
  integrityScore: number;
  weakestCategory?: string | null;
  strongestCategory?: string | null;
  recentMisses: number;
};

type AdaptivePactSizeResult = {
  adjustedAction: string;
  sizeLevel: "tiny" | "small" | "standard" | "expanded";
  reason: string;
};

function shrinkAction(action: string): string {
  if (action.toLowerCase().includes("run")) {
    return "Run for 5 minutes";                                                                                                                                                                                                                                                                                                                 
  }

  if (action.toLowerCase().includes("work")) {
    return "Complete one visible step";
  }

  if (action.toLowerCase().includes("clean")) {
    return "Clean one small area";
  }

  if (action.toLowerCase().includes("write")) {
    return "Write one paragraph";
  }

  return "Do the first visible step";
}

function expandAction(action: string): string {
  if (action.toLowerCase().includes("run")) {
    return "Run for 30 minutes";
  }

  if (action.toLowerCase().includes("work")) {
    return "Complete a full focused session";
  }

  return action;
}

export function calculateAdaptivePactSize(
  input: AdaptivePactSizeInput
): AdaptivePactSizeResult {
  const {
    action,
    category,
    difficulty,
    integrityScore,
    weakestCategory,
    strongestCategory,
    recentMisses,
  } = input;

  let adjustedAction = action;
  let sizeLevel: AdaptivePactSizeResult["sizeLevel"] = "standard";
  let reason = "Pact size unchanged.";

  if (integrityScore < 50) {
    adjustedAction = shrinkAction(action);
    sizeLevel = "tiny";
    reason = "Low integrity requires smaller, winnable actions.";
  }

  else if (recentMisses >= 3) {
    adjustedAction = shrinkAction(action);
    sizeLevel = "small";
    reason = "Recent misses suggest the task needs to be reduced.";
  }

  else if (
    weakestCategory &&
    weakestCategory.toLowerCase() === category.toLowerCase()
  ) {
    adjustedAction = shrinkAction(action);
    sizeLevel = "small";
    reason = "This is a weak category. Keep the task tighter.";
  }

  else if (difficulty >= 4) {
    adjustedAction = shrinkAction(action);
    sizeLevel = "small";
    reason = "High difficulty tasks perform better when reduced.";
  }

  else if (
    integrityScore >= 80 &&
    strongestCategory &&
    strongestCategory.toLowerCase() === category.toLowerCase()
  ) {
    adjustedAction = expandAction(action);
    sizeLevel = "expanded";
    reason = "Strong follow-through allows for larger commitments.";
  }

  return {
    adjustedAction,
    sizeLevel,
    reason,
  };
}
