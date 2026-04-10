import type { PsychProfile } from "@/lib/psych-engine";

const KEY = "lockstep_psych_profile";

export function savePsychProfile(profile: PsychProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function getPsychProfile(): PsychProfile | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PsychProfile;
  } catch {
    return null;
  }
}

export function clearPsychProfile() {
  localStorage.removeItem(KEY);
}
