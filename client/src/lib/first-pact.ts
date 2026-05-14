export type FirstPactInput = {
  action: string;
  category: "health" | "work" | "money" | "relationships" | "personal";
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export type FirstPactResult = {
  action: string;
  deadlineAt: string;
  stake: number;
  proofMethod: "check_in" | "photo" | "location" | "calendar" | "manual";
  reason: string;
};

function shortWindowDeadline(difficulty: FirstPactInput["difficulty"]) {
  const minutesByDifficulty: Record<FirstPactInput["difficulty"], number> = {
    1: 30,
    2: 45,
    3: 60,
    4: 90,
    5: 120,
  };

  const minutes = minutesByDifficulty[difficulty] ?? 60;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function shrinkFirstAction(
  action: string,
  category: FirstPactInput["category"],
): string {
  const lower = action.toLowerCase();

  if (category === "health") {
    if (lower.includes("run")) return "Run for 5 minutes.";
    if (lower.includes("workout")) return "Do 5 minutes of movement.";
    return "Do 5 minutes of movement.";
  }

  if (category === "work") {
    if (lower.includes("write")) return "Write one paragraph.";
    if (lower.includes("email")) return "Send one important email.";
    return "Complete one visible work step.";
  }

  if (category === "money") {
    return "Take one measurable money action.";
  }

  if (category === "relationships") {
    if (lower.includes("call")) return "Make one call.";
    return "Send one direct message.";
  }

  return "Do one visible step.";
}

export function buildFirstPact(input: FirstPactInput): FirstPactResult {
  const action = shrinkFirstAction(input.action, input.category);

  return {
    action,
    deadlineAt: shortWindowDeadline(input.difficulty),
    stake: 5,
    proofMethod: "check_in",
    reason:
      "First pacts are reduced and accelerated to create a fast, believable win.",
  };
}
