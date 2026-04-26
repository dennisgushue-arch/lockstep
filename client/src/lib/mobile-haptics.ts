type HapticStrength = "light" | "medium";

export async function triggerTinyStepHaptic(strength: HapticStrength = "light") {
  if (typeof window === "undefined") return;

  const capacitor = (window as any).Capacitor;
  const isNative = Boolean(capacitor?.isNativePlatform?.());

  if (!isNative) {
    return;
  }

  try {
    const haptics = capacitor?.Plugins?.Haptics;

    if (haptics?.impact) {
      await haptics.impact({ style: strength === "medium" ? "MEDIUM" : "LIGHT" });
      return;
    }

    if (haptics?.vibrate) {
      await haptics.vibrate({ duration: strength === "medium" ? 14 : 8 });
      return;
    }
  } catch {
    // no-op: haptics are purely enhancement
  }
}
