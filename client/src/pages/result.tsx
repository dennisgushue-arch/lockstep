import React, { useMemo } from "react";
import { getRecoveryPlan } from "@/lib/identity-recovery";

export default function ResultPage({ score = 42, commitment = { status: "missed" } }) {
  const recoveryPlan = useMemo(() => getRecoveryPlan(score), [score]);

  return (
    <div className="p-8">
      {commitment.status === "completed" ? (
        <div className="text-green-500">You did it!</div>
      ) : (
        <div className="text-red-500">You missed this one.</div>
      )}

      {recoveryPlan.mode !== "none" && (
        <div className="mt-6 border border-red-900/40 bg-red-950/10 p-5 space-y-3">
          <div className="text-xs uppercase tracking-widest text-red-400">
            {recoveryPlan.headline}
          </div>
          <div className="text-sm text-zinc-200">
            {recoveryPlan.instruction}
          </div>
          <div className="text-sm text-zinc-300">
            {recoveryPlan.nextAction}
          </div>
        </div>
      )}
    </div>
  );
}
