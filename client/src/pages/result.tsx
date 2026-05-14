import React, { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useApp } from "@/lib/mock-data";
import { getRecoveryPlan } from "@/lib/identity-recovery";
import { buildStreakIdentity, calculateBouncebackIdentity } from "@/lib/streak-identity";
import { buildWitnessMessage } from "@/lib/witness-message";
import { hasSeenMicroTooltip, markMicroTooltipSeen } from "@/lib/micro-tooltips";
import { Button } from "@/components/ui/button";
import { getProofConfidenceLabel, getProofMethodLabel } from "@/lib/proof";
import PressurePaywall from "@/components/pressure-paywall";
import { analytics } from "@/lib/analytics";

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

  const celebrate = useMemo(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(search);
    return params.get("celebrate") === "1";
  }, []);

  const commitment = useMemo(() => {
    if (!commitmentId) return null;
    return commitments.find((c) => c.id === commitmentId) ?? null;
  }, [commitments, commitmentId]);

  if (!commitment) {
    return (
      <div className="ls-screen p-8 space-y-4">
        <div className="text-muted">No result found. The pact may have been cleared.</div>
        <div className="flex gap-3">
          <Button onClick={() => setLocation("/momentum")}>Go to Momentum</Button>
          <Button className="ls-button-primary font-black" onClick={() => setLocation("/capture")}>Start New Pact</Button>
        </div>
      </div>
    );
  }

  const safeScore = Math.round((behaviorProfile.completionRate ?? 0) * 100);
  const recoveryPlan = useMemo(() => getRecoveryPlan(safeScore), [safeScore]);
  const streakIdentity = useMemo(() => buildStreakIdentity(commitments), [commitments]);
  const bouncebackIdentity = useMemo(() => calculateBouncebackIdentity(commitments), [commitments]);
  const completedCount = useMemo(
    () => commitments.filter((item) => item.status === "completed").length,
    [commitments]
  );
  const previousScore = useMemo(() => {
    if (commitment.status !== "completed") return safeScore;
    const previousCompleted = Math.max(0, completedCount - 1);
    return commitments.length > 0
      ? Math.round((previousCompleted / commitments.length) * 100)
      : safeScore;
  }, [commitment.status, commitments.length, completedCount, safeScore]);
  const scoreBump = Math.max(0, safeScore - previousScore);
  const [copiedWitness, setCopiedWitness] = useState(false);
  const [sharedProofCard, setSharedProofCard] = useState(false);
  const showFirstMissTooltip = commitment.status === "missed" && !hasSeenMicroTooltip("firstMiss");
  const showFirstWinPaywall = commitment.status === "completed" && completedCount === 1;
  const action = commitment.actionText || commitment.intent?.text || "Unknown action";
  const completedAt = commitment.proofSubmission?.submittedAt || commitment.scheduledDate;
  const completedTimeLabel = new Date(completedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const microProofTitle = completedCount === 1 ? "First pact honored" : "Pact honored";
  const microProofShareText = `I just completed my commitment 🎉\n\n${action}\nCompleted at ${completedTimeLabel}\nMomentum score: ${safeScore}\nBounceback score: ${bouncebackIdentity.bouncebackScore}\n\n#Lockstep #CommitmentKept`;

  async function shareMicroProofCard() {
    try {
      analytics.track("result_share_clicked", {
        commitment_id: commitment!.id,
        status: commitment!.status,
        completed_count: completedCount,
      });

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: microProofTitle,
          text: microProofShareText,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(microProofShareText);
      }

      setSharedProofCard(true);
      setTimeout(() => setSharedProofCard(false), 2000);
    } catch (error) {
      console.error("Share failed", error);
      setSharedProofCard(false);
    }
  }

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
    <div className="ls-screen p-8">
      {showFirstMissTooltip && (
        <button
          type="button"
          onClick={() => markMicroTooltipSeen("firstMiss")}
          className="mb-4 inline-flex items-center rounded-none surface-subtle px-2 py-1 text-xs text-muted"
        >
          You didn’t follow through
        </button>
      )}
      {commitment.status === "completed" ? (
        <div className="ls-card ls-glow-purple p-4 text-green-300 font-black uppercase tracking-[0.14em]">YOU FOLLOWED THROUGH</div>
      ) : (
        <div className="ls-card ls-glow-red p-4 text-danger font-black uppercase tracking-[0.14em] ls-flash-red">YOU MISSED IT</div>
      )}

      {commitment.status === "missed" && (
        <div className="mt-4 border border-red-700/50 bg-red-950/25 p-5 space-y-3 glow-danger-soft ls-card ls-glow-red">
          <div className="text-xs uppercase tracking-[0.2em] text-danger font-bold">Don&apos;t lose the day</div>
          <div className="text-sm text-muted">You missed this one. Recover fast with one compassionate next move.</div>
          <div className="text-sm text-purple-300 font-black uppercase tracking-[0.12em]">BOUNCE BACK</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: "DO A 2-MIN VERSION NOW", prefill: `2-minute recovery: ${action}`, variant: "two_minute_now" },
              { label: "RESCHEDULE IN 3 HOURS", prefill: `Reschedule this recovery for the next 3 hours: ${action}`, variant: "reschedule_3h" },
              { label: "LOWER THE STAKES", prefill: `Lower-stakes recovery: ${action}`, variant: "lower_stakes" },
            ].map((option) => (
              <Button
                key={option.variant}
                className="rounded-none font-bold btn-danger text-white text-xs h-auto py-3"
                onClick={() => {
                  const missedAt = commitment.scheduledDate;
                  const missedAtMs = new Date(missedAt).getTime();
                  const within24h = Number.isFinite(missedAtMs)
                    ? Date.now() - missedAtMs <= 24 * 60 * 60 * 1000
                    : null;
                  analytics.track("recovery_prompt_clicked", {
                    source: "result_page",
                    commitment_id: commitment.id,
                    within_24h: within24h,
                    recovery_variant: option.variant,
                  });
                  setLocation(`/capture?prefill=${encodeURIComponent(option.prefill)}&recovery_from=${encodeURIComponent(commitment.id)}&missed_at=${encodeURIComponent(missedAt)}&recovery_variant=${encodeURIComponent(option.variant)}`);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {celebrate && commitment.status === "completed" && (
        <div className="mt-4 border border-violet-700/50 bg-violet-950/20 p-6 space-y-5 glow-purple-soft ls-card ls-glow-purple ls-float">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300 font-bold">FIRST WIN</div>
          <div className="space-y-2">
            <div className="text-4xl font-black text-emerald-50 leading-none">You kept your word.</div>
            <div className="text-lg text-emerald-200 font-semibold">That&apos;s how trust in yourself is rebuilt.</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-emerald-700/40 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-emerald-300/70">Integrity bump</div>
              <div className="text-2xl font-black text-emerald-100">+{scoreBump}</div>
            </div>
            <div className="border border-emerald-700/40 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-emerald-300/70">Momentum score</div>
              <div className="text-2xl font-black text-emerald-100">{safeScore}</div>
            </div>
            <div className="border border-emerald-700/40 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-emerald-300/70">Bounceback score</div>
              <div className="text-2xl font-black text-emerald-100">{bouncebackIdentity.bouncebackScore}</div>
            </div>
          </div>
          <div className="border border-violet-700/40 bg-black/30 p-4 space-y-2 glow-purple-soft">
            <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/70">Shareable proof</div>
            <div className="text-2xl font-black text-white">{microProofTitle}</div>
            <div className="text-sm text-zinc-200">Completed at {completedTimeLabel}</div>
            <div className="text-sm text-zinc-300">Momentum {safeScore} · Bounceback {bouncebackIdentity.bouncebackScore}</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-none font-bold bg-emerald-500 hover:bg-emerald-400 text-black" onClick={shareMicroProofCard}>
              {sharedProofCard ? "COPIED" : "SHARE COMPLETION"}
            </Button>
            <Button className="rounded-none ls-button-primary font-black" onClick={() => setLocation("/capture")}>LOCK NEXT PACT</Button>
          </div>
        </div>
      )}

      {/* AI-selected proof method */}
      {commitment.intent?.proof_method && (
        <div className="mt-4 surface-subtle p-4 space-y-2">
          <div className="text-xs uppercase tracking-widest label-subtle">AI-Selected Proof Method</div>
          <div className="text-base font-bold text-white">
            {commitment.intent.proof_method.toUpperCase().replace(/_/g, " ")}
          </div>
          {commitment.intent.proof_confidence && (
            <div className="text-xs text-subtle">
              Confidence: <span className="font-semibold uppercase">{commitment.intent.proof_confidence}</span>
            </div>
          )}
          {commitment.intent.proof_reason && (
            <div className="text-xs label-subtle">{commitment.intent.proof_reason}</div>
          )}
        </div>
      )}

      <div className="mt-4 surface-subtle p-4 space-y-2">
        <div className="text-xs uppercase tracking-widest label-subtle">Proof</div>
        {commitment.proofSubmission ? (
          <>
            <div className="text-sm text-muted">
              Proof submitted: <span className="font-semibold">{getProofMethodLabel(commitment.proofSubmission.method)}</span>
            </div>
            <div className="text-sm text-muted">
              Confidence: <span className="font-semibold">{getProofConfidenceLabel(commitment.proofSubmission.confidence)}</span>
            </div>
            {commitment.proofSubmission.text && (
              <div className="text-sm text-muted">{commitment.proofSubmission.text}</div>
            )}
            {commitment.proofSubmission.photoDataUrl && (
              <img
                src={commitment.proofSubmission.photoDataUrl}
                alt="Submitted proof"
                className="max-h-56 border border-zinc-700"
              />
            )}
            {commitment.proofSubmission.aiValidation && (
              <div className="text-xs text-subtle">
                Validation: {commitment.proofSubmission.aiValidation.result === "pass" ? "Looks aligned" : "Flagged as weak"} — {commitment.proofSubmission.aiValidation.reason}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-sm text-muted">No proof submitted</div>
            {commitment.status === "missed" && (
              <div className="text-xs text-danger">Result: Missed</div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 text-sm text-subtle">
        {commitment.status === "completed"
          ? `${streakIdentity.currentStreak} promises kept in a row.`
          : "The chain broke."}
      </div>

      <div className="mt-2 text-sm text-subtle">Bounceback score: {bouncebackIdentity.bouncebackScore}</div>

      {commitment.status === "completed" && completedCount === 1 && (
        <div className="mt-4 border border-emerald-700/40 bg-emerald-950/20 p-4 text-sm text-emerald-100">
          You followed through because something was at risk.
        </div>
      )}

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
            className="rounded-none font-bold ls-button-danger text-white"
            onClick={() => {
              const missedAt = commitment.scheduledDate;
              setLocation(`/capture?prefill=${encodeURIComponent(`2-minute recovery: ${action}`)}&recovery_from=${encodeURIComponent(commitment.id)}&missed_at=${encodeURIComponent(missedAt)}&recovery_variant=two_minute_now`);
            }}
          >
            DON&apos;T LOSE THE DAY
          </Button>
        )}
        <Button variant="secondary" className="rounded-none" onClick={() => setLocation("/momentum")}>
          {commitment.status === "completed" ? "Back to Momentum" : "Return to Momentum"}
        </Button>
      </div>
    </div>
  );
}
