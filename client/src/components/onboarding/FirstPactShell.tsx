import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const STEP_ACCENTS: Record<number, string> = {
  1: "from-red-500/20 via-zinc-900/0 to-zinc-900/0",
  2: "from-orange-400/15 via-zinc-900/0 to-zinc-900/0",
  3: "from-amber-300/15 via-zinc-900/0 to-zinc-900/0",
  4: "from-emerald-300/20 via-zinc-900/0 to-zinc-900/0",
};

export default function FirstPactShell({
  step,
  totalSteps,
  children,
}: {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  const progress = Math.max(0, Math.min(100, Math.round((step / totalSteps) * 100)));
  const accent = STEP_ACCENTS[step] ?? STEP_ACCENTS[1];

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center px-4 py-8 overflow-hidden">
      <motion.div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent}`}
        initial={{ opacity: 0.2 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        key={`accent-${step}`}
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            First Pact
          </div>
          <div className="h-1 w-full bg-zinc-900 overflow-hidden">
            <motion.div
              className="h-full bg-white transition-all duration-300"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              aria-hidden="true"
            />
          </div>
          <div className="text-[11px] text-zinc-500">
            Step {step} of {totalSteps}
          </div>
        </div>

        <div className="border border-zinc-800/90 bg-zinc-950/60 p-6 sm:p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_12px_30px_rgba(0,0,0,0.55)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, y: 10, filter: "blur(1px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(1px)" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
