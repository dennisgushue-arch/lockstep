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

export function buildPactInviteDeepLink(commitmentId: string, invitee: string, mode: DeepLinkMode = "act") {
  return `lockstep://pact/${commitmentId}?mode=${mode}&invitee=${encodeURIComponent(invitee)}`;
}

export function buildPactInviteShareUrl(commitmentId: string, invitee: string, mode: DeepLinkMode = "act") {
  if (typeof window !== "undefined" && window.location?.origin) {
    const params = new URLSearchParams({ source: "invite", mode, invitee });
    return `${window.location.origin}/pact/${commitmentId}/act?${params.toString()}`;
  }
  return buildPactInviteDeepLink(commitmentId, invitee, mode);
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

  const invitee = parsed.searchParams.get("invitee");
  const source = parsed.searchParams.get("source");
  const queryParams = new URLSearchParams();
  queryParams.set("source", source || "notification");
  if (invitee) queryParams.set("invitee", invitee);
  const qs = queryParams.toString();

  if (mode === "act") {
    return `/pact/${commitmentId}/act?${qs}`;
  }

  if (mode === "prove") {
    return `/pact/${commitmentId}/prove?${qs}`;
  }

  if (mode === "missed") {
    return `/result/${commitmentId}?${qs}`;
  }

  if (mode === "recovery") {
    return `/recovery/${commitmentId}?${qs}`;
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
  if (params.get("source") === "invite") {
    const invitee = params.get("invitee");
    return {
      title: "Team invite",
      body: invitee
        ? `${invitee}, you've been invited to witness/confirm this pact.`
        : "You've been invited to witness/confirm this pact.",
    };
  }

  if (params.get("source") === "notification") {
    return {
      title: "Opened from deadline alert",
      body: "You're close to missing this.",
    };
  }

  return null;
}