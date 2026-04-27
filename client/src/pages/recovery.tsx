import React, { useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { readSourceBanner } from "@/lib/deeplink";
import { hasSeenMicroTooltip, markMicroTooltipSeen } from "@/lib/micro-tooltips";
import PressurePaywall from "@/components/pressure-paywall";

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
        <div className="text-zinc-300">Recovery target not found.</div>
        <Button onClick={() => setLocation("/momentum")}>Back to Momentum</Button>
      </div>
    );
  }

  const actionLabel = buildRecoveryAction(commitment.actionText || commitment.intent.goal || commitment.intent.text || "");
  const prefill = encodeURIComponent(actionLabel);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12 min-h-[calc(100vh-64px)] flex items-center">
      <div className="w-full space-y-6 border border-zinc-800 bg-black/40 p-8">
        {showFirstRecoveryTooltip && (
          <button
            type="button"
            onClick={() => markMicroTooltipSeen("firstRecovery")}
            className="inline-flex items-center rounded-none border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-200"
          >
            Fix it immediately
          </button>
        )}

        {sourceBanner && (
          <div className="border border-red-900/40 bg-red-950/10 p-4">
            <div className="text-xs uppercase tracking-widest text-red-300">{sourceBanner.title}</div>
            <div className="text-sm text-zinc-300 mt-2">{sourceBanner.body}</div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Recovery required</div>
          <h1 className="text-4xl font-heading font-bold text-white">{actionLabel}</h1>
        </div>

        <div className="border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Urgency</div>
          <div className="text-xl font-semibold text-red-300 mt-2">Next 2 hours</div>
        </div>

        <Button
          className="rounded-none h-14 text-lg font-bold bg-red-600 hover:bg-red-700 text-white"
          onClick={() => setLocation(`/capture?prefill=${prefill}&recovery_from=${commitment.id}`)}
        >
          START RECOVERY
        </Button>

        <PressurePaywall triggerLabel="After recovery" mode="urgency" />
      </div>
    </div>
  );
}