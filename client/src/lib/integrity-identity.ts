export type IntegrityIdentity = {
  level: "critical" | "fragile" | "unstable" | "solid" | "reliable" | "iron";
  label: string;
  description: string;
  colorClass: string;
  borderClass: string;
};

export function getIntegrityIdentity(score: number): IntegrityIdentity {
  if (score >= 90) {
    return {
      level: "iron",
      label: "Iron",
      description: "You do what you say, even under pressure.",
      colorClass: "text-cyan-300",
      borderClass: "border-cyan-500/40 bg-cyan-950/10",
    };
  }

  if (score >= 80) {
    return {
      level: "reliable",
      label: "Reliable",
      description: "Your word is becoming dependable.",
      colorClass: "text-green-400",
      borderClass: "border-green-500/40 bg-green-950/10",
    };
  }

  if (score >= 70) {
    return {
      level: "solid",
      label: "Solid",
      description: "You follow through more often than you slip.",
      colorClass: "text-emerald-300",
      borderClass: "border-emerald-500/40 bg-emerald-950/10",
    };
  }

  if (score >= 60) {
    return {
      level: "unstable",
      label: "Unstable",
      description: "You can follow through, but the pattern still breaks often.",
      colorClass: "text-yellow-300",
      borderClass: "border-yellow-500/40 bg-yellow-950/10",
    };
  }

  if (score >= 45) {
    return {
      level: "fragile",
      label: "Fragile",
      description: "Your word is inconsistent and vulnerable to pressure.",
      colorClass: "text-orange-300",
      borderClass: "border-orange-500/40 bg-orange-950/10",
    };
  }

  return {
    level: "critical",
    label: "Critical",
    description: "You are building a pattern of non-follow-through.",
    colorClass: "text-red-400",
    borderClass: "border-red-500/40 bg-red-950/10",
  };
}

export function getIntegrityIdentityPressureLine(score: number): string {
  const identity = getIntegrityIdentity(score);

  switch (identity.level) {
    case "iron":
      return "A miss here damages a strong pattern.";
    case "reliable":
      return "Protect the standard you are building.";
    case "solid":
      return "This is where reliability becomes real or slips backward.";
    case "unstable":
      return "Another miss reinforces inconsistency.";
    case "fragile":
      return "You need a clean win before this pattern hardens.";
    case "critical":
      return "You cannot afford another casual miss.";
    default:
      return "Protect the score.";
  }
}
