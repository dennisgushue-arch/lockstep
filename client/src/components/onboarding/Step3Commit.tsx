import React from "react";
import { Button } from "@/components/ui/button";
import type { Intent } from "@/lib/mock-data";

export default function Step3Commit({
  intent,
  onNext,
  isLoading = false,
}: {
  intent: Intent;
  onNext: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-2xl font-bold">Lock it in</h1>

      <div className="border border-zinc-800 p-5 bg-zinc-950 space-y-3">
        <div className="text-lg font-bold">{intent.action || intent.goal}</div>
        <div className="text-zinc-400">{intent.deadline}</div>
        <div>{intent.stake ?? intent.suggested_stake} credits at risk</div>
      </div>

      <p className="text-sm text-red-400">
        If you don’t do this, your score drops.
      </p>

      <Button
        onClick={onNext}
        disabled={isLoading}
        className="w-full h-14 bg-white text-black font-black hover:bg-zinc-200"
      >
        {isLoading ? "LOCKING IN..." : "LOCK IT IN"}
      </Button>
    </div>
  );
}
