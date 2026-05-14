import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function CinematicActivePact({
  pact,
  onComplete,
  onCantDoIt,
}: {
  pact: any;
  onComplete?: () => void;
  onCantDoIt?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeLeft = useMemo(() => {
    const end = new Date(pact.scheduledDate).getTime();
    const diff = Math.max(0, end - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [now, pact.scheduledDate]);

  const action =
    pact.action_text ||
    pact.actionText ||
    pact.intent?.action ||
    pact.intent?.text ||
    "Your pact";

  const stake = pact.stake_amount || pact.creditsCost || 5;
  const finalHour = useMemo(() => {
    const end = new Date(pact.scheduledDate).getTime();
    return end - now <= 60 * 60 * 1000;
  }, [now, pact.scheduledDate]);

  return (
    <section className="ls-card ls-glow-purple p-6 text-center space-y-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.22),transparent_55%)]" />

      <div className="relative z-10 space-y-5">
        <div className="text-xs uppercase tracking-[0.35em] text-purple-300">
          Active Pact
        </div>

        <h2 className="text-3xl font-black leading-tight">
          {action}
        </h2>

        <div className="mx-auto ls-ring ls-pulse">
          <div>
            <div className="text-5xl font-black tabular-nums">
              {timeLeft}
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-500 mt-2">
              Time Left
            </div>
          </div>
        </div>

        {finalHour ? (
          <div className="text-sm font-bold text-red-400 ls-flash-red">Start before the final hour.</div>
        ) : (
          <div className="text-sm font-bold text-red-400">Miss this → lose {stake} credits</div>
        )}

        <Button
          onClick={onComplete}
          className="w-full h-14 ls-button-primary font-black text-base"
        >
          I DID IT
        </Button>

        <button
          onClick={onCantDoIt}
          className="text-sm text-zinc-500"
        >
          Can’t do it
        </button>
      </div>
    </section>
  );
}
