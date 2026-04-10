import React from "react";
import type { StreakIdentity } from "@/lib/streak-identity";

export default function StreakIdentityCard({
  streak,
}: {
  streak: StreakIdentity;
}) {
  // Share handler: copy to clipboard and open share dialog if available
  const handleShare = () => {
    const text = `I'm on a ${streak.currentStreak}-day streak in Lockstep! 🏆`;
    if (navigator.share) {
      navigator.share({
        title: "My Lockstep Streak",
        text,
        url: window.location.origin + "/dashboard",
      });
    } else {
      navigator.clipboard.writeText(text + " " + window.location.origin + "/dashboard");
      alert("Streak copied! Share it with your friends or accountability partner.");
    }
  };

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
      <button
        className="mt-2 px-3 py-1 rounded bg-blue-700 text-white text-xs hover:bg-blue-800 transition"
        onClick={handleShare}
        type="button"
      >
        Share Streak
      </button>
    </div>
  );
}
