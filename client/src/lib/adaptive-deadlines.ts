type AdaptiveDeadlineInput = {
  baseDeadline: string | null;
  difficulty: number;
  integrityScore: number;
  bestTimeOfDay?: "morning" | "afternoon" | "evening" | "unknown";
  worstTimeOfDay?: "morning" | "afternoon" | "evening" | "unknown";
  calendarRiskLevel?: "low" | "medium" | "high";
};

type AdaptiveDeadlineResult = {
  suggestedDeadline: string;
  reason: string;
};

function getTodayAt(hour: number, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function shiftToTomorrow(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function clampFuture(date: Date) {
  const now = new Date();
  return date < now ? shiftToTomorrow(date) : date;
}

export function calculateAdaptiveDeadline(
  input: AdaptiveDeadlineInput
): AdaptiveDeadlineResult {
  const {
    baseDeadline,
    difficulty,
    integrityScore,
    bestTimeOfDay = "unknown",
    worstTimeOfDay = "unknown",
    calendarRiskLevel = "low",
  } = input;

  let reason = "Deadline adjusted for follow-through.";

  let targetTime: Date;

  if (baseDeadline) {
    const parsed = new Date(baseDeadline);
    targetTime = Number.isNaN(parsed.getTime()) ? getTodayAt(19, 0) : parsed;
  } else if (difficulty >= 4) {
    targetTime = getTodayAt(17, 0);
    reason = "Harder tasks perform better earlier in the day.";
  } else {
    targetTime = getTodayAt(19, 0);
  }

  if (bestTimeOfDay === "morning") {
    targetTime = getTodayAt(9, 0);
    reason = "You follow through best in the morning.";
  } else if (bestTimeOfDay === "afternoon") {
    targetTime = getTodayAt(14, 0);
    reason = "You follow through best in the afternoon.";
  } else if (bestTimeOfDay === "evening") {
    targetTime = getTodayAt(19, 0);
    reason = "You follow through best in the evening.";
  }

  if (
    worstTimeOfDay === "evening" &&
    targetTime.getHours() >= 18
  ) {
    targetTime = getTodayAt(15, 0);
    reason = "Evening is a weak point. Moved earlier.";
  }

  if (
    worstTimeOfDay === "morning" &&
    targetTime.getHours() < 12
  ) {
    targetTime = getTodayAt(15, 0);
    reason = "Morning is a weak point. Moved later.";
  }

  if (integrityScore < 50) {
    targetTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    reason = "Short deadlines increase follow-through when integrity is low.";
  }

  if (calendarRiskLevel === "high") {
    targetTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    reason = "Calendar is crowded. Sooner deadline reduces risk.";
  }

  targetTime = clampFuture(targetTime);

  return {
    suggestedDeadline: targetTime.toISOString(),
    reason,
  };
}
