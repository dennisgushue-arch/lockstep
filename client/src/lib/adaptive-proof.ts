// Distinct from ProofMethod in proof.ts — this engine uses "check_in" and "location"
// which are the full roadmap method names. lock-in.tsx maps these to the submission
// ProofMethod type via adaptiveMethodToProofMethod().
export type AdaptiveProofMethod = "check_in" | "photo" | "text" | "location" | "witness";

export type AdaptiveProofInput = {
  category: string;
  difficulty: number;
  integrityScore: number;
  weakestCategory?: string | null;
  strongestCategory?: string | null;
  recentMisses: number;
  hasWitness?: boolean;
};

export type AdaptiveProofResult = {
  method: AdaptiveProofMethod;
  confidence: "low" | "medium" | "high";
  reason: string;
};

export function calculateAdaptiveProof(
  input: AdaptiveProofInput
): AdaptiveProofResult {
  const {
    category,
    difficulty,
    integrityScore,
    weakestCategory,
    strongestCategory,
    recentMisses,
    hasWitness,
  } = input;

  // LOW INTEGRITY → lower friction, rebuild consistency
  if (integrityScore < 50) {
    return {
      method: "check_in",
      confidence: "low",
      reason: "Lower friction proof helps rebuild consistency.",
    };
  }

  // REPEATED FAILURES → visible confirmation without high friction
  if (recentMisses >= 3) {
    return {
      method: "text",
      confidence: "medium",
      reason: "You need visible confirmation without high friction.",
    };
  }

  // WEAK CATEGORY → force visibility
  if (
    weakestCategory &&
    weakestCategory.toLowerCase() === category.toLowerCase()
  ) {
    return {
      method: "photo",
      confidence: "medium",
      reason: "This is a weak category. Visual proof increases follow-through.",
    };
  }

  // STRONG USER + STRONG CATEGORY → high standard
  if (
    integrityScore >= 80 &&
    strongestCategory &&
    strongestCategory.toLowerCase() === category.toLowerCase()
  ) {
    return {
      method: hasWitness ? "witness" : "photo",
      confidence: "high",
      reason: "High integrity requires stronger proof.",
    };
  }

  // HIGH DIFFICULTY → stronger proof
  if (difficulty >= 4) {
    return {
      method: "photo",
      confidence: "high",
      reason: "Hard tasks need visible confirmation.",
    };
  }

  // DEFAULT
  return {
    method: "text",
    confidence: "medium",
    reason: "Standard proof for balanced accountability.",
  };
}
