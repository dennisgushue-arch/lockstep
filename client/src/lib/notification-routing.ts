export function routeFromNotificationUrl(url: string, setLocation: (path: string) => void) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const pactId = parts[1];
    const mode = parsed.searchParams.get("mode");

    if (!pactId) return;

    if (mode === "act") {
      setLocation(`/pact/${pactId}/act`);
      return;
    }

    if (mode === "prove") {
      setLocation(`/pact/${pactId}/prove`);
      return;
    }

    if (mode === "missed") {
      setLocation(`/result?commitment_id=${pactId}`);
      return;
    }

    if (mode === "recovery") {
      setLocation(`/recovery/${pactId}`);
      return;
    }

    setLocation("/momentum");
  } catch (error) {
    console.error("Invalid notification URL", error);
  }
}
