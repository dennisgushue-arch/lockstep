export type DeepLinkMode = "act" | "prove" | "missed" | "recovery";

function normalizeSegments(url: URL) {
  const pathSegments = url.pathname.split("/").filter(Boolean);
  if (url.hostname) {
    return [url.hostname, ...pathSegments];
  }
  return pathSegments;
}

export function buildPactDeepLink(commitmentId: string, mode: DeepLinkMode) {
  return `lockstep://pact/${commitmentId}?mode=${mode}`;
}

export function mapDeepLinkToRoute(url: string) {
  const parsed = new URL(url);
  const segments = normalizeSegments(parsed);
  const mode = parsed.searchParams.get("mode") as DeepLinkMode | null;

  if (segments[0] !== "pact") {
    return null;
  }

  const commitmentId = segments[1];
  if (!commitmentId || !mode) {
    return null;
  }

  if (mode === "act") {
    return `/pact/${commitmentId}/act?source=notification`;
  }

  if (mode === "prove") {
    return `/pact/${commitmentId}/prove?source=notification`;
  }

  if (mode === "missed") {
    return `/result/${commitmentId}?source=notification`;
  }

  if (mode === "recovery") {
    return `/recovery/${commitmentId}?source=notification`;
  }

  return null;
}

export function handleDeepLink(url: string, setLocation: (path: string) => void) {
  try {
    const next = mapDeepLinkToRoute(url);
    if (next) {
      setLocation(next);
    }
  } catch (error) {
    console.error("Invalid deep link", error);
  }
}

export function readSourceBanner(search: string) {
  const params = new URLSearchParams(search);
  if (params.get("source") === "notification") {
    return {
      title: "Opened from deadline alert",
      body: "You're close to missing this.",
    };
  }

  return null;
}