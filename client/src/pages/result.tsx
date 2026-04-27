import React, { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useApp } from "@/lib/mock-data";
import { getRecoveryPlan } from "@/lib/identity-recovery";
import { buildStreakIdentity } from "@/lib/streak-identity";
import { buildWitnessMessage } from "@/lib/witness-message";
import { hasSeenMicroTooltip, markMicroTooltipSeen } from "@/lib/micro-tooltips";
import { Button } from "@/components/ui/button";
import { getProofConfidenceLabel, getProofMethodLabel } from "@/lib/proof";
import PressurePaywall from "@/components/pressure-paywall";

export default function ResultPage() {
  const [, routeParams] = useRoute("/result/:id");
  const [, setLocation] = useLocation();
  const { commitments, behaviorProfile } = useApp();

  const commitmentId = useMemo(() => {
    if (routeParams?.id) return routeParams.id;
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(search);
    return params.get("commitment_id");
  }, [routeParams?.id]);

  const commitment = useMemo(() => {
    if (!commitmentId) return null;
    return commitments.find((c) => c.id === commitmentId) ?? null;
  }, [commitments, commitmentId]);

  if (!commitment) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-zinc-300">No result found. The pact may have been cleared.</div>
        <div className="flex gap-3">
          <Button onClick={() => setLocation("/momentum")}>Go to Momentum</Button>
          <Button variant="secondary" onClick={() => setLocation("/capture")}>Start New Pact</Button>
        </div>
      </div>
    );
  }

  const safeScore = Math.round((behaviorProfile.completionRate ?? 0) * 100);
  const recoveryPlan = useMemo(() => getRecoveryPlan(safeScore), [safeScore]);
  const streakIdentity = useMemo(() => buildStreakIdentity(commitments), [commitments]);
  const completedCount = useMemo(
    () => commitments.filter((item) => item.status === "completed").length,
    [commitments]
  );
  const [copiedWitness, setCopiedWitness] = useState(false);
  const showFirstMissTooltip = commitment.status === "missed" && !hasSeenMicroTooltip("firstMiss");
  const showFirstWinPaywall = commitment.status === "completed" && completedCount === 1;

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
      {showFirstMissTooltip && (
        <button
          type="button"
          onClick={() => markMicroTooltipSeen("firstMiss")}
          className="mb-4 inline-flex items-center rounded-none border border-zinc-700 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-200"
        >
          You didn’t follow through
        </button>
      )}
      {commitment.status === "completed" ? (
        <div className="text-green-500">You did it!</div>
      ) : (
        <div className="text-red-500">You missed this one.</div>
      )}

      {/* AI-selected proof method */}
      {commitment.intent?.proof_method && (
        <div className="mt-4 border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-zinc-500">AI-Selected Proof Method</div>
          <div className="text-base font-bold text-white">
            {commitment.intent.proof_method.toUpperCase().replace(/_/g, " ")}
          </div>
          {commitment.intent.proof_confidence && (
            <div className="text-xs text-zinc-400">
              Confidence: <span className="font-semibold uppercase">{commitment.intent.proof_confidence}</span>
            </div>
          )}
          {commitment.intent.proof_reason && (
            <div className="text-xs text-zinc-500">{commitment.intent.proof_reason}</div>
          )}
        </div>
      )}

      <div className="mt-4 border border-zinc-800 bg-black/20 p-4 space-y-2">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Proof</div>
        {commitment.proofSubmission ? (
          <>
            <div className="text-sm text-zinc-200">
              Proof submitted: <span className="font-semibold">{getProofMethodLabel(commitment.proofSubmission.method)}</span>
            </div>
            <div className="text-sm text-zinc-200">
              Confidence: <span className="font-semibold">{getProofConfidenceLabel(commitment.proofSubmission.confidence)}</span>
            </div>
            {commitment.proofSubmission.text && (
              <div className="text-sm text-zinc-300">{commitment.proofSubmission.text}</div>
            )}
            {commitment.proofSubmission.photoDataUrl && (
              <img
                src={commitment.proofSubmission.photoDataUrl}
                alt="Submitted proof"
                className="max-h-56 border border-zinc-700"
              />
            )}
            {commitment.proofSubmission.aiValidation && (
              <div className="text-xs text-zinc-400">
                Validation: {commitment.proofSubmission.aiValidation.result === "pass" ? "Looks aligned" : "Flagged as weak"} — {commitment.proofSubmission.aiValidation.reason}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-sm text-zinc-300">No proof submitted</div>
            {commitment.status === "missed" && (
              <div className="text-xs text-red-300">Result: Missed</div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 text-sm text-zinc-400">
        {commitment.status === "completed"
          ? `${streakIdentity.currentStreak} promises kept in a row.`
          : "The chain broke."}
      </div>

      {showFirstWinPaywall && (
        <PressurePaywall triggerLabel="After first win" mode="celebratory" className="mt-6" />
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

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {commitment.status === "missed" && (
          <Button
            className="rounded-none font-bold bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setLocation("/capture")}
          >
            START RECOVERY PACT
          </Button>
        )}
        <Button variant="secondary" className="rounded-none" onClick={() => setLocation("/momentum")}>
          {commitment.status === "completed" ? "Back to Momentum" : "Return to Momentum"}
        </Button>
      </div>
    </div>
  );
}
