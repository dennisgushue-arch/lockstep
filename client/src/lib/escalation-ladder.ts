import type { AdaptiveProofMethod } from "./adaptive-proof";

export type EscalationLadderCategory =
  | "health"
  | "work"
  | "money"
  | "relationships"
  | "personal";

export type EscalationStage = "foundation" | "stretch";

export type EscalationLadderInput = {
  action: string;
  category: EscalationLadderCategory;
  completedCount: number;
  adaptiveStake: number;
  adaptiveProofMethod: AdaptiveProofMethod;
  adaptiveSizeLevel: "tiny" | "small" | "standard" | "expanded";
};

export type EscalationLadderResult = {
  stage: EscalationStage;
  action: string;
  stake: number;
  proofMethod: AdaptiveProofMethod;
  sizeLevel: "small" | "standard" | "expanded";
  reason: string;
  stakeReason: string;
  proofReason: string;
  sizeReason: string;
};

const proofStrength: Record<AdaptiveProofMethod, number> = {
  check_in: 1,
  text: 2,
  photo: 3,
  location: 4,
  witness: 5,
};

function ensureMinimumProof(
  current: AdaptiveProofMethod,
  minimum: AdaptiveProofMethod,
): AdaptiveProofMethod {
  return proofStrength[current] >= proofStrength[minimum] ? current : minimum;
}

function foundationAction(action: string, category: EscalationLadderCategory) {
  const lower = action.toLowerCase();

  if (category === "health") {
    if (lower.includes("run")) return "Run for 10 minutes.";
    if (lower.includes("workout") || lower.includes("movement")) return "Do 10 minutes of movement.";
    return "Complete one full health action.";
  }

  if (category === "work") {
    if (lower.includes("write")) return "Write two paragraphs.";
    if (lower.includes("email")) return "Send two important emails.";
    return "Complete a focused 15-minute work block.";
  }

  if (category === "money") {
    return "Take one money action and record the result.";
  }

  if (category === "relationships") {
    if (lower.includes("call")) return "Make one call and follow up.";
    return "Send one direct message and follow up once.";
  }

  return "Complete one focused step.";
}

function stretchAction(action: string, category: EscalationLadderCategory) {
  const lower = action.toLowerCase();

  if (category === "health") {
    if (lower.includes("run")) return "Run for 20 minutes.";
    if (lower.includes("workout") || lower.includes("movement")) return "Do 20 minutes of movement.";
    return "Complete a full health session.";
  }

  if (category === "work") {
    if (lower.includes("write")) return "Write for 25 focused minutes.";
    if (lower.includes("email")) return "Clear your highest-priority emails for 20 minutes.";
    return "Complete a focused 30-minute work block.";
  }

  if (category === "money") {
    return "Complete one focused 20-minute money session.";
  }

  if (category === "relationships") {
    return "Make one call or have one direct conversation.";
  }

  return "Complete two focused steps.";
}

export function buildEscalationLadder(
  input: EscalationLadderInput,
): EscalationLadderResult | null {
  if (input.completedCount === 1) {
    return {
      stage: "foundation",
      action:
        input.adaptiveSizeLevel === "expanded"
          ? input.action
          : foundationAction(input.action, input.category),
      stake: Math.max(input.adaptiveStake, 10),
      proofMethod: ensureMinimumProof(input.adaptiveProofMethod, "text"),
      sizeLevel: input.adaptiveSizeLevel === "expanded" ? "expanded" : "small",
      reason:
        "You completed your first pact, so Lockstep is stepping the next one up slightly to build momentum.",
      stakeReason:
        "After the first win, the stake increases a little so the pact still feels real without spiking pressure.",
      proofReason:
        "After the first win, proof becomes a bit more visible so consistency turns into accountability.",
      sizeReason:
        "After the first win, the task grows from tiny to small so the system starts training real follow-through.",
    };
  }

  if (input.completedCount === 2) {
    return {
      stage: "stretch",
      action:
        input.adaptiveSizeLevel === "expanded"
          ? input.action
          : stretchAction(input.action, input.category),
      stake: Math.max(input.adaptiveStake, 15),
      proofMethod: ensureMinimumProof(input.adaptiveProofMethod, "photo"),
      sizeLevel: input.adaptiveSizeLevel === "expanded" ? "expanded" : "standard",
      reason:
        "Two wins in, Lockstep raises the standard again so your early streak becomes a durable pattern.",
      stakeReason:
        "The stake rises again on your second follow-up pact to keep commitment intensity growing with confidence.",
      proofReason:
        "Proof becomes stronger here so the system captures visible evidence before handing off to the full adaptive model.",
      sizeReason:
        "The task expands again after two wins so you build capacity instead of repeating an easy starter loop.",
    };
  }

  return null;
}