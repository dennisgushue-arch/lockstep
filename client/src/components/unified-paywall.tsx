import React, { useMemo } from "react";
import PressurePaywall, { type PressurePaywallMode } from "@/components/pressure-paywall";

export type UnifiedPaywallContext =
  | "second-pact"
  | "first-win"
  | "low-credits"
  | "landing";

type UnifiedPaywallProps = {
  context: UnifiedPaywallContext;
  className?: string;
};

type UnifiedConfig = {
  triggerLabel: string;
  mode: PressurePaywallMode;
  ctaHref?: string;
  ctaLabel?: string;
  dismissLabel?: string;
};

const CONTEXT_CONFIG: Record<UnifiedPaywallContext, UnifiedConfig> = {
  "second-pact": {
    triggerLabel: "When creating 2nd pact",
    mode: "escalation",
    ctaHref: "/credits",
    ctaLabel: "TURN UP THE PRESSURE",
    dismissLabel: "Stay limited (1 pact only)",
  },
  "first-win": {
    triggerLabel: "After first win",
    mode: "celebratory",
    ctaHref: "/credits",
    ctaLabel: "LOCK THE NEXT WIN",
    dismissLabel: "Stay limited for now",
  },
  "low-credits": {
    triggerLabel: "Low credits detected",
    mode: "urgency",
    ctaHref: "/credits",
    ctaLabel: "TOP UP CREDITS",
    dismissLabel: "I’ll risk running out",
  },
  landing: {
    triggerLabel: "Unlock stronger pressure",
    mode: "escalation",
    ctaHref: "/auth",
    ctaLabel: "START WITH REAL CONSEQUENCE",
    dismissLabel: "Keep browsing",
  },
};

export default function UnifiedPaywall({ context, className }: UnifiedPaywallProps) {
  const config = useMemo(() => CONTEXT_CONFIG[context], [context]);

  return (
    <PressurePaywall
      triggerLabel={config.triggerLabel}
      mode={config.mode}
      ctaHref={config.ctaHref}
      ctaLabel={config.ctaLabel}
      dismissLabel={config.dismissLabel}
      className={className}
    />
  );
}
