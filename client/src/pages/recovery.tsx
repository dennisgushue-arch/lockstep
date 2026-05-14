import React, { useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { readSourceBanner } from "@/lib/deeplink";
import { hasSeenMicroTooltip, markMicroTooltipSeen } from "@/lib/micro-tooltips";
import PressurePaywall from "@/components/pressure-paywall";
import { analytics } from "@/lib/analytics";

function buildRecoveryAction(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("call")) return "Make one call now";
  if (lower.includes("message") || lower.includes("text")) return "Send one message now";
  if (lower.includes("run")) return "Do 5 minutes now";
  if (lower.includes("write")) return "Write one paragraph now";
  return "Do one visible recovery step now";
}

export default function RecoveryPage() {
  const [, params] = useRoute("/recovery/:id");
  const [, setLocation] = useLocation();
  const { commitments } = useApp();

  const commitment = useMemo(
    () => commitments.find((item) => item.id === params?.id) ?? null,
    [commitments, params?.id],
  );

  const sourceBanner = useMemo(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    return readSourceBanner(search);
  }, []);
  const showFirstRecoveryTooltip = !hasSeenMicroTooltip("firstRecovery");

  if (!commitment) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12 space-y-4">
        <div className="text-muted">Recovery target not found.</div>
        <Button onClick={() => setLocation("/momentum")}>Back to Momentum</Button>
      </div>
    );
  }

  const actionLabel = buildRecoveryAction(commitment.actionText || commitment.intent.goal || commitment.intent.text || "");
  const recoveryOptions = [
    {
      label: "DO A 2-MIN VERSION NOW",
      prefill: `2-minute recovery: ${actionLabel}`,
      variant: "two_minute_now",
    },
    {
      label: "RESCHEDULE IN 3 HOURS",
      prefill: `Reschedule this recovery for the next 3 hours: ${actionLabel}`,
      variant: "reschedule_3h",
    },
    {
      label: "LOWER THE STAKES",
      prefill: `Lower-stakes recovery: ${actionLabel}`,
      variant: "lower_stakes",
    },
  ] as const;

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12 min-h-[calc(100vh-64px)] flex items-center">
      <div className="w-full space-y-6 surface-gradient p-8 glow-purple-soft">
        {showFirstRecoveryTooltip && (
          <button
            type="button"
            onClick={() => markMicroTooltipSeen("firstRecovery")}
            className="inline-flex items-center rounded-none panel-danger px-2 py-1 text-xs text-danger"
          >
            Fix it immediately
          </button>
        )}

        {sourceBanner && (
          <div className="panel-danger p-4">
            <div className="text-xs uppercase tracking-widest text-danger">{sourceBanner.title}</div>
            <div className="text-sm text-muted mt-2">{sourceBanner.body}</div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest label-subtle">Recovery required</div>
          <h1 className="text-4xl font-heading font-bold text-white">{actionLabel}</h1>
          <div className="text-sm text-muted">Don&apos;t lose the day. Pick the smallest recovery that gets you back in motion.</div>
        </div>

        <div className="surface-subtle p-4">
          <div className="text-xs uppercase tracking-widest label-subtle">Urgency</div>
          <div className="text-xl font-semibold text-danger mt-2">Next 2 hours</div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {recoveryOptions.map((option) => (
            <Button
              key={option.variant}
              className="rounded-none h-auto min-h-14 text-xs font-bold btn-danger py-3 glow-danger-soft"
              onClick={() => {
                analytics.track("recovery_option_selected", {
                  source: "recovery_page",
                  commitment_id: commitment.id,
                  recovery_variant: option.variant,
                });
                setLocation(`/capture?prefill=${encodeURIComponent(option.prefill)}&recovery_from=${commitment.id}&missed_at=${encodeURIComponent(commitment.scheduledDate)}&recovery_variant=${encodeURIComponent(option.variant)}`);
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <PressurePaywall triggerLabel="After recovery" mode="urgency" />
      </div>
    </div>
  );
}