const TOOLTIP_STORAGE_KEY = "lockstep_micro_tooltips_v1";

export type MicroTooltipKey = "firstLockIn" | "firstMiss" | "firstRecovery";

type MicroTooltipState = Partial<Record<MicroTooltipKey, boolean>>;

function readState(): MicroTooltipState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(TOOLTIP_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeState(state: MicroTooltipState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOOLTIP_STORAGE_KEY, JSON.stringify(state));
}

export function hasSeenMicroTooltip(key: MicroTooltipKey): boolean {
  return Boolean(readState()[key]);
}

export function markMicroTooltipSeen(key: MicroTooltipKey) {
  const next = {
    ...readState(),
    [key]: true,
  };
  writeState(next);
}
