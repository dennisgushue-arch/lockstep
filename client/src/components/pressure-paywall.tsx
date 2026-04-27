import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlarmClock,
  ArrowRight,
  Flame,
  Layers3,
  PartyPopper,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

export type PressurePaywallMode = "celebratory" | "escalation" | "urgency";

type PressurePaywallProps = {
  triggerLabel: string;
  mode?: PressurePaywallMode;
  className?: string;
};

type ToneConfig = {
  eyebrow: string;
  contextLine: string;
  topLineAccent: string;
  rightGlowAccent: string;
  topDotAccent: string;
  pressureUpgradeAccent: string;
  pulseShadow: string[];
  toneIcon: LucideIcon;
  toneIconClassName: string;
};

const TONE_CONFIG: Record<PressurePaywallMode, ToneConfig> = {
  celebratory: {
    eyebrow: "Win secured",
    contextLine: "You proved it once. Raise pressure before momentum fades.",
    topLineAccent: "via-emerald-400/60",
    rightGlowAccent: "from-emerald-500/10",
    topDotAccent: "bg-emerald-400",
    pressureUpgradeAccent: "text-emerald-300",
    pulseShadow: [
      "0 0 0 rgba(16,185,129,0)",
      "0 0 0 8px rgba(16,185,129,0.12)",
      "0 0 0 rgba(16,185,129,0)",
    ],
    toneIcon: PartyPopper,
    toneIconClassName: "text-emerald-300",
  },
  escalation: {
    eyebrow: "Stack pressure",
    contextLine: "One pact is a test. Two pacts build identity.",
    topLineAccent: "via-red-500/50",
    rightGlowAccent: "from-red-500/6",
    topDotAccent: "bg-red-400",
    pressureUpgradeAccent: "text-red-400",
    pulseShadow: [
      "0 0 0 rgba(239,68,68,0)",
      "0 0 0 8px rgba(239,68,68,0.12)",
      "0 0 0 rgba(239,68,68,0)",
    ],
    toneIcon: TrendingUp,
    toneIconClassName: "text-red-300",
  },
  urgency: {
    eyebrow: "Recovery window",
    contextLine: "Act now. Pressure is strongest before the next excuse lands.",
    topLineAccent: "via-amber-400/60",
    rightGlowAccent: "from-amber-400/12",
    topDotAccent: "bg-amber-300",
    pressureUpgradeAccent: "text-amber-300",
    pulseShadow: [
      "0 0 0 rgba(251,191,36,0)",
      "0 0 0 9px rgba(251,191,36,0.16)",
      "0 0 0 rgba(251,191,36,0)",
    ],
    toneIcon: AlarmClock,
    toneIconClassName: "text-amber-300",
  },
};

export default function PressurePaywall({
  triggerLabel,
  mode = "escalation",
  className,
}: PressurePaywallProps) {
  const [dismissed, setDismissed] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const tone = TONE_CONFIG[mode];
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (dismissed || hasTrackedView.current) return;

    hasTrackedView.current = true;
    analytics.track("paywall_viewed", {
      mode,
      triggerLabel,
      surface: "pressure_paywall",
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [dismissed, mode, triggerLabel]);

  function handleCtaClick() {
    analytics.track("paywall_cta_clicked", {
      mode,
      triggerLabel,
      surface: "pressure_paywall",
      destination: "/credits",
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }

  function handleDismiss() {
    analytics.track("paywall_dismissed", {
      mode,
      triggerLabel,
      surface: "pressure_paywall",
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    setDismissed(true);
  }

  const pressureLevers = useMemo(
    () => [
      "Multiple active pacts",
      "Witness Mode (real accountability)",
      "Hard Mode (no easy outs)",
      "Stronger consequences",
    ],
    []
  );

  const visualBlocks = useMemo(
    () => [
      {
        label: "Stacked pacts",
        icon: Layers3,
        iconClassName: "text-zinc-100",
        cardClassName: "border-zinc-800 bg-black/40",
      },
      {
        label: "Witness",
        icon: ShieldCheck,
        iconClassName: "text-zinc-100",
        cardClassName: "border-zinc-800 bg-black/40",
      },
      {
        label: "Higher stakes",
        icon: Flame,
        iconClassName: "text-red-400",
        cardClassName: "border-red-900/50 bg-red-950/20",
      },
    ],
    []
  );

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`relative overflow-hidden border border-zinc-800 bg-zinc-950/85 p-4 sm:p-6 space-y-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_50px_rgba(0,0,0,0.35)] ${className ?? ""}`}
        >
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${tone.topLineAccent} to-transparent`} />
          <div className={`absolute inset-y-0 right-0 w-24 bg-gradient-to-l ${tone.rightGlowAccent} to-transparent pointer-events-none`} />

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.04, duration: 0.24 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.28em] text-zinc-400">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone.topDotAccent}`} />
                {triggerLabel}
              </div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-600">Pro</div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[1.85rem] leading-[0.95] sm:text-4xl font-heading font-bold text-white text-balance">
                You followed through.
              </h3>
              <p className="text-sm sm:text-base text-zinc-400">Most people don&apos;t.</p>
              <div className="inline-flex items-center gap-2 text-xs text-zinc-400">
                <tone.toneIcon className={`w-3.5 h-3.5 ${tone.toneIconClassName}`} />
                <span className="uppercase tracking-[0.2em] text-zinc-500">{tone.eyebrow}</span>
              </div>
              <p className="text-sm text-zinc-300">{tone.contextLine}</p>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.24 }}
            className="border border-zinc-800 bg-black/50 p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.24em] text-zinc-500">
              <span>Free</span>
              <span className={tone.pressureUpgradeAccent}>Pressure upgrade</span>
            </div>
            <div className="text-sm text-zinc-400">Free lets you try this.</div>
            <div className="text-xl sm:text-2xl font-semibold text-white leading-tight text-balance">Pro makes it real.</div>
          </motion.div>

          <div className="space-y-2.5">
            {pressureLevers.map((lever, index) => (
              <motion.div
                key={lever}
                initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                transition={{ delay: 0.14 + index * 0.05, duration: 0.2 }}
                className="flex items-center gap-3 border border-zinc-800 bg-black/25 px-3 py-2.5"
              >
                <span className="text-red-400 text-sm leading-none">•</span>
                <span className="text-sm text-zinc-100">{lever}</span>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {visualBlocks.map(({ label, icon: Icon, iconClassName, cardClassName }, index) => (
              <motion.div
                key={label}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 0.24 + index * 0.05, duration: 0.22 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                className={`border p-3 flex min-h-[92px] flex-col items-center justify-center gap-2 text-center ${cardClassName}`}
              >
                <Icon className={`w-5 h-5 ${iconClassName}`} />
                <div className="text-[11px] uppercase tracking-widest text-zinc-400 text-center">{label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.22 }}
            className="space-y-3 border border-zinc-800 bg-black/55 p-3 sm:p-4"
          >
            <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
              <span>1 tap upgrade</span>
              <span className="text-zinc-600">More pressure. Less escape.</span>
            </div>

            <motion.div
              animate={
                prefersReducedMotion
                  ? undefined
                  : { boxShadow: tone.pulseShadow }
              }
              transition={{ duration: mode === "urgency" ? 1.8 : 2.2, repeat: Infinity, repeatDelay: mode === "urgency" ? 0.8 : 1.2 }}
              className="rounded-none"
            >
              <Button asChild className="w-full rounded-none h-14 bg-white text-black hover:bg-zinc-200 font-black tracking-[0.16em] text-[13px] sm:text-sm shadow-[0_10px_30px_rgba(255,255,255,0.08)]">
                <Link href="/credits" onClick={handleCtaClick}>
                  <span>TURN UP THE PRESSURE</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </motion.div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Stay limited (1 pact only)
            </button>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
