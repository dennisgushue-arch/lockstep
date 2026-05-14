import React from "react";
import { Button } from "@/components/ui/button";
import type { Intent } from "@/lib/mock-data";

export default function Step2Transform({
  intent,
  onNext,
}: {
  intent: Intent;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-2xl font-bold">Here’s your pact:</h1>

      <p className="text-zinc-400">One action. One deadline. One stake. One proof.</p>

      <div className="border border-zinc-800 p-5 text-left space-y-3 bg-zinc-950">
        <div>
          <div className="text-xs text-zinc-500 uppercase">Action</div>
          <div className="text-lg font-bold">{intent.action || intent.goal}</div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 uppercase">Deadline</div>
          <div>{intent.deadline}</div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 uppercase">Stake</div>
          <div>{intent.stake ?? intent.suggested_stake} credits</div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 uppercase">Proof</div>
          <div>{intent.proof_method}</div>
        </div>
      </div>

      {intent.is_first_pact && (
        <div className="border border-green-900/40 bg-green-950/10 p-4 text-left">
          <div className="text-xs uppercase tracking-widest text-green-400">
            Why this is small
          </div>
          <div className="mt-2 text-sm text-zinc-300">
            {intent.first_pact_reason || "This first pact is intentionally small so you can get a real first win."}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Simple on purpose. Doable on purpose.
      </p>

      <Button
        onClick={onNext}
        className="w-full h-14 bg-red-600 text-white font-bold hover:bg-red-700"
      >
        LOCK IT IN
      </Button>
    </div>
  );
}
