export type PaywallMode = "celebratory" | "escalation" | "urgency";

export type PaywallAnalyticsEventName =
  | "paywall_viewed"
  | "paywall_cta_clicked"
  | "paywall_dismissed";

export type PaywallAnalyticsEvent = {
  event: PaywallAnalyticsEventName;
  mode?: string;
  triggerLabel?: string;
  surface?: string;
  path?: string;
  destination?: string;
  timestamp?: string;
};

export type PaywallCtrRow = {
  mode: PaywallMode;
  views: number;
  clicks: number;
  ctr: number;
};

const MODES: PaywallMode[] = ["celebratory", "escalation", "urgency"];

function isPaywallMode(value: unknown): value is PaywallMode {
  return typeof value === "string" && (MODES as string[]).includes(value);
}

function toCtr(clicks: number, views: number) {
  if (views <= 0) return 0;
  return clicks / views;
}

/**
 * Calculates CTR by paywall mode from a stream of analytics events.
 *
 * Formula:
 * CTR_mode = paywall_cta_clicked / paywall_viewed
 */
export function calculatePaywallCtrByMode(
  events: PaywallAnalyticsEvent[]
): PaywallCtrRow[] {
  const counters: Record<PaywallMode, { views: number; clicks: number }> = {
    celebratory: { views: 0, clicks: 0 },
    escalation: { views: 0, clicks: 0 },
    urgency: { views: 0, clicks: 0 },
  };

  for (const event of events) {
    if (!isPaywallMode(event.mode)) continue;

    if (event.event === "paywall_viewed") {
      counters[event.mode].views += 1;
      continue;
    }

    if (event.event === "paywall_cta_clicked") {
      counters[event.mode].clicks += 1;
    }
  }

  return MODES.map((mode) => {
    const views = counters[mode].views;
    const clicks = counters[mode].clicks;

    return {
      mode,
      views,
      clicks,
      ctr: toCtr(clicks, views),
    };
  });
}

/**
 * Convenience formatter for dashboards / logs.
 */
export function formatCtrRows(rows: PaywallCtrRow[]) {
  return rows.map((row) => ({
    ...row,
    ctrPercent: `${(row.ctr * 100).toFixed(2)}%`,
  }));
}
