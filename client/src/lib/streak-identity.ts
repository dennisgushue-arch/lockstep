type CommitmentLike = {
  status: "scheduled" | "completed" | "missed";
  scheduledDate: string;
};

export type StreakIdentity = {
  currentStreak: number;
  longestStreak: number;
  streakLabel: string;
  streakDescription: string;
  pressureLine: string;
};

export function calculatePromiseStreaks(commitments: CommitmentLike[]) {
  const resolved = commitments
    .filter((c) => c.status === "completed" || c.status === "missed")
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  let currentStreak = 0;
  for (const c of resolved) {
    if (c.status === "completed") currentStreak += 1;
    else break;
  }

  let longestStreak = 0;
  let running = 0;

  for (const c of [...resolved].reverse()) {
    if (c.status === "completed") {
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 0;
    }
  }

  return { currentStreak, longestStreak };
}

export function getStreakIdentity(streak: number): Omit<StreakIdentity, "currentStreak" | "longestStreak"> {
  if (streak >= 20) {
    return {
      streakLabel: "Locked In",
      streakDescription: "Your follow-through is becoming automatic.",
      pressureLine: "Do not break a strong chain.",
    };
  }
  if (streak >= 10) {
    return {
      streakLabel: "Dangerous",
      streakDescription: "You are building serious momentum.",
      pressureLine: "This streak now means something.",
    };
  }
  if (streak >= 5) {
    return {
      streakLabel: "Real",
      streakDescription: "This is no longer random. It is becoming a pattern.",
      pressureLine: "Protect the chain before it resets.",
    };
  }
  if (streak >= 2) {
    return {
      streakLabel: "Forming",
      streakDescription: "A pattern is starting to emerge.",
      pressureLine: "Another kept pact makes this real.",
    };
  }
  if (streak === 1) {
    return {
      streakLabel: "Started",
      streakDescription: "One promise kept. Start building from here.",
      pressureLine: "Do not let this collapse back to zero.",
    };
  }
  return {
    streakLabel: "None",
    streakDescription: "No active chain yet.",
    pressureLine: "Keep one pact to start the chain.",
  };
}

export function buildStreakIdentity(commitments: CommitmentLike[]): StreakIdentity {
  const { currentStreak, longestStreak } = calculatePromiseStreaks(commitments);
  const identity = getStreakIdentity(currentStreak);
  return {
    currentStreak,
    longestStreak,
    ...identity,
  };
}
