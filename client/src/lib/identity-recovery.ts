import { getIntegrityIdentity } from "@/lib/integrity-identity";

export type RecoveryPlan = {
  mode: "none" | "stabilize" | "rebuild";
  headline: string;
  instruction: string;
  nextAction: string;
  deadlineHint: string;
  reason: string;
};

export function getRecoveryPlan(score: number): RecoveryPlan {
  const identity = getIntegrityIdentity(score);

  if (identity.level === "critical") {
    return {
      mode: "rebuild",
      headline: "Recovery Required",
      instruction: "You need a clean win immediately.",
      nextAction: "Do one small task within the next 2–3 hours.",
      deadlineHint: "Same-day only",
      reason: "Small, immediate wins are the fastest way to rebuild trust.",
    };
  }

  if (identity.level === "fragile") {
    return {
      mode: "stabilize",
      headline: "Stabilize Your Pattern",
      instruction: "Do not take on anything large right now.",
      nextAction: "Complete one small, clearly defined task today.",
      deadlineHint: "Today",
      reason: "Consistency returns through controlled, winnable actions.",
    };
  }

  return {
    mode: "none",
    headline: "",
    instruction: "",
    nextAction: "",
    deadlineHint: "",
    reason: "",
  };
}
