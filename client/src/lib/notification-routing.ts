export function routeFromNotificationUrl(url: string, setLocation: (path: string) => void) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const pactId = parts[1];
    const mode = parsed.searchParams.get("mode");
    const invitee = parsed.searchParams.get("invitee");
    const source = parsed.searchParams.get("source") || "notification";

    if (!pactId) return;

    const query = new URLSearchParams({ source });
    if (invitee) query.set("invitee", invitee);
    const qs = query.toString();

    if (mode === "act") {
      setLocation(`/pact/${pactId}/act?${qs}`);
      return;
    }

    if (mode === "prove") {
      setLocation(`/pact/${pactId}/prove?${qs}`);
      return;
    }

    if (mode === "missed") {
      setLocation(`/result?commitment_id=${pactId}&${qs}`);
      return;
    }

    if (mode === "recovery") {
      setLocation(`/recovery/${pactId}?${qs}`);
      return;
    }

    setLocation("/momentum");
  } catch (error) {
    console.error("Invalid notification URL", error);
  }
}
