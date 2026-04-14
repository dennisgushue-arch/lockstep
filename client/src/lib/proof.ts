export type ProofMethod = "checkin" | "photo" | "text" | "witness";

export type ProofConfidence = "low" | "medium" | "high";

export type ProofSubmission = {
  method: ProofMethod;
  confidence: ProofConfidence;
  text?: string | null;
  photoDataUrl?: string | null;
  witnessConfirmed?: boolean;
  submittedAt: string;
  aiValidation?: {
    result: "pass" | "weak";
    reason: string;
  } | null;
};

export function getProofMethodLabel(method: ProofMethod): string {
  switch (method) {
    case "checkin":
      return "Check-in";
    case "photo":
      return "Photo";
    case "text":
      return "Text";
    case "witness":
      return "Witness";
    default:
      return "Check-in";
  }
}

export function getProofConfidence(method: ProofMethod): ProofConfidence {
  switch (method) {
    case "checkin":
      return "low";
    case "photo":
    case "text":
      return "medium";
    case "witness":
      return "high";
    default:
      return "low";
  }
}

export function getProofConfidenceLabel(confidence: ProofConfidence): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export function suggestProofMethodForTask(category?: string | null): ProofMethod {
  const normalized = (category || "").toLowerCase();

  if (["recovery", "habit_recovery", "reset"].includes(normalized)) {
    return "checkin";
  }

  if (["fitness", "health", "workout"].includes(normalized)) {
    return "photo";
  }

  if (["work", "career", "business", "money", "finance", "relationship", "social"].includes(normalized)) {
    return "text";
  }

  return "photo";
}

// ---------------------------------------------------------------------------
// Adaptive Proof Policy
// ---------------------------------------------------------------------------

export type AdaptiveProofPolicy = {
  /** Minimum proof method the user is allowed to select. */
  minimumMethod: ProofMethod;
  /** Methods the user may choose (others are locked out). */
  allowedMethods: ProofMethod[];
  /** Short nudge line displayed on lock-in screen. Empty when no restriction. */
  nudgeMessage: string;
  /** Whether the minimum is a hard requirement (cannot downgrade) or just a suggestion. */
  required: boolean;
};

/**
 * Returns an adaptive proof policy based on the user's current integrity score.
 *
 * Tiers align with integrity-identity.ts:
 *   critical (<45) / fragile (<60)  → recovery: check-in only (low friction, keep engagement)
 *   unstable (<70)                  → suggestion: photo or text (medium proof encouraged)
 *   solid (<80)                     → photo/text/witness (weak check-in no longer sufficient)
 *   reliable (<90) / iron (≥90)     → photo min; photo+text+witness all available, nudge toward witness
 */
export function getAdaptiveProofPolicy(integrityScore: number): AdaptiveProofPolicy {
  if (integrityScore < 45) {
    // critical — keep friction low to rebuild momentum
    return {
      minimumMethod: "checkin",
      allowedMethods: ["checkin", "photo", "text", "witness"],
      nudgeMessage: "Recovery mode: check-in is allowed. Focus on starting.",
      required: false,
    };
  }

  if (integrityScore < 60) {
    // fragile — allow check-in but push toward photo/text
    return {
      minimumMethod: "checkin",
      allowedMethods: ["checkin", "photo", "text", "witness"],
      nudgeMessage: "Your track record is fragile. Photo or text proof builds trust faster.",
      required: false,
    };
  }

  if (integrityScore < 70) {
    // unstable — check-in still allowed, but nudge strongly toward medium proof
    return {
      minimumMethod: "checkin",
      allowedMethods: ["checkin", "photo", "text", "witness"],
      nudgeMessage: "You're inconsistent — medium proof (photo or text) is recommended.",
      required: false,
    };
  }

  if (integrityScore < 80) {
    // solid — check-in no longer enough, minimum is photo or text
    return {
      minimumMethod: "photo",
      allowedMethods: ["photo", "text", "witness"],
      nudgeMessage: "Solid tier: check-in alone is no longer accepted. Photo or text required.",
      required: true,
    };
  }

  if (integrityScore < 90) {
    // reliable — medium proof minimum; push toward witness
    return {
      minimumMethod: "photo",
      allowedMethods: ["photo", "text", "witness"],
      nudgeMessage: "Reliable tier: you've earned a higher standard. Consider witness proof.",
      required: true,
    };
  }

  // iron — photo minimum; strongly encourage witness
  return {
    minimumMethod: "photo",
    allowedMethods: ["photo", "text", "witness"],
    nudgeMessage: "Iron tier: your bar is high. Witness proof is the right level for you.",
    required: true,
  };
}

export function validateTextProofAgainstTask(taskText: string, proofText: string): { result: "pass" | "weak"; reason: string } {
  const taskTokens = new Set(
    taskText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3)
  );

  const proofTokens = new Set(
    proofText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3)
  );

  if (taskTokens.size === 0 || proofTokens.size === 0) {
    return { result: "weak", reason: "Not enough detail to verify task match." };
  }

  const overlap = Array.from(taskTokens).filter((token) => proofTokens.has(token)).length;
  if (overlap >= 1) {
    return { result: "pass", reason: "Text aligns with the task description." };
  }

  return { result: "weak", reason: "Proof text may not match the committed task." };
}
