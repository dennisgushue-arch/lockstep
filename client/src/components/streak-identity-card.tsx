import React from "react";
import type { StreakIdentity } from "@/lib/streak-identity";

export default function StreakIdentityCard({
  streak,
}: {
  streak: StreakIdentity;
}) {
  return (
    <div className="border border-zinc-800 bg-zinc-950/30 p-5 space-y-3 rounded-xl shadow-md">
      <div className="text-xs uppercase tracking-widest text-zinc-500">
        Streak Identity
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">{streak.streakLabel}</div>
          <div className="text-sm text-zinc-300 mt-1">{streak.streakDescription}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{streak.currentStreak}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Kept In A Row</div>
        </div>
      </div>
      <div className="text-sm text-zinc-400">{streak.pressureLine}</div>
      <div className="text-xs text-zinc-500">Best streak: {streak.longestStreak}</div>
    </div>
  );
}
