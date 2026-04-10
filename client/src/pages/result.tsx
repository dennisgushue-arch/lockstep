import React, { useMemo, useState } from "react";
import { useApp } from "@/lib/mock-data";
import { getRecoveryPlan } from "@/lib/identity-recovery";
import { buildStreakIdentity } from "@/lib/streak-identity";
import { buildWitnessMessage } from "@/lib/witness-message";
import { Button } from "@/components/ui/button";
import type { Commitment } from "@/lib/mock-data";

type ResultPageProps = {
  score?: number;
  commitment?: Commitment | null;
};

export default function ResultPage({ score = 42, commitment = { status: "missed" } as Commitment }: ResultPageProps) {
  if (!commitment) return null;

  const safeScore = typeof score === "number" ? score : 0;
  const { commitments } = useApp();
  const recoveryPlan = useMemo(() => getRecoveryPlan(safeScore), [safeScore]);
  const streakIdentity = useMemo(() => buildStreakIdentity(commitments), [commitments]);
  const [copiedWitness, setCopiedWitness] = useState(false);

  // Build action text for witness message
  const action = commitment.actionText || commitment.intent?.text || "Unknown action";

  // Build witness message
  const witnessMessage =
    commitment.witness?.name
      ? buildWitnessMessage({
          witnessName: commitment.witness.name,
          action,
          result: commitment.status === "completed" ? "completed" : "missed",
          stake: commitment.creditsCost || 0,
          score: safeScore,
        })
      : null;

  // Copy witness message function
  async function copyWitnessMessage() {
    if (!witnessMessage) return;

    try {
      await navigator.clipboard.writeText(witnessMessage);
      setCopiedWitness(true);
      setTimeout(() => setCopiedWitness(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  }

  return (
    <div className="p-8">
      {commitment.status === "completed" ? (
        <div className="text-green-500">You did it!</div>
      ) : (
        <div className="text-red-500">You missed this one.</div>
      )}

      <div className="mt-4 text-sm text-zinc-400">
        {commitment.status === "completed"
          ? `${streakIdentity.currentStreak} promises kept in a row.`
          : "The chain broke."}
      </div>

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

      {commitment.witness?.name && witnessMessage && (
        <div className="mt-6 border border-red-900/40 bg-red-950/10 p-5 space-y-4">
          <div className="text-xs uppercase tracking-widest text-red-400">
            Witness Mode
          </div>

          <div className="text-sm text-zinc-200">
            {commitment.status === "missed"
              ? `This result can now be sent to ${commitment.witness.name}.`
              : `${commitment.witness.name} can be updated on this result.`}
          </div>

          <div className="border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-300">
            {witnessMessage}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              variant="secondary"
              className="rounded-none"
              onClick={copyWitnessMessage}
            >
              {copiedWitness ? "COPIED" : "COPY WITNESS MESSAGE"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
