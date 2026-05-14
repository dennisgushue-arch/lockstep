const FALLBACK_STORE_URL = "https://play.google.com/store/apps/details?id=com.dennisgushue.lockstepbeta";

declare global {
  interface Window {
    Capacitor?: any;
  }
}

export async function requestNativeReview() {
  if (typeof window === "undefined") {
    return { requested: false, fallback: false };
  }

  const capacitor = window.Capacitor;
  const plugins = capacitor?.Plugins;

  try {
    if (plugins?.InAppReview?.requestReview) {
      await plugins.InAppReview.requestReview();
      return { requested: true, fallback: false };
    }

    if (plugins?.AppReview?.requestReview) {
      await plugins.AppReview.requestReview();
      return { requested: true, fallback: false };
    }

    if (plugins?.StoreReview?.requestReview) {
      await plugins.StoreReview.requestReview();
      return { requested: true, fallback: false };
    }
  } catch (error) {
    console.warn("[Review] Native review request failed, using fallback", error);
  }

  const reviewUrl =
    import.meta.env.VITE_REVIEW_URL ||
    import.meta.env.VITE_PLAY_STORE_URL ||
    import.meta.env.VITE_APP_STORE_URL ||
    FALLBACK_STORE_URL;

  window.open(reviewUrl, "_blank", "noopener,noreferrer");
  return { requested: false, fallback: true };
}
