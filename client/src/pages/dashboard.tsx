import React, { useMemo } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { getIntegrityIdentity } from "@/lib/integrity-identity";
import { buildRealityFeedback } from "@/lib/reality-feedback";
import { buildStreakIdentity } from "@/lib/streak-identity";
import IntegrityIdentityCard from "@/components/integrity-identity-card";
import RealityFeedbackCard from "@/components/reality-feedback-card";
import StreakIdentityCard from "@/components/streak-identity-card";
import CinematicActivePact from "@/components/cinematic-active-pact";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { commitments, creditBalance, completeCommitment, markMissed, behaviorProfile } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const integrityScore = useMemo(
    () => Math.round((behaviorProfile.completionRate ?? 0) * 100),
    [behaviorProfile.completionRate]
  );

  const integrityIdentity = useMemo(
    () => getIntegrityIdentity(integrityScore),
    [integrityScore]
  );

  const realityFeedback = useMemo(() => buildRealityFeedback(commitments), [commitments]);
  const streakIdentity = useMemo(() => buildStreakIdentity(commitments), [commitments]);

  const activePact = useMemo(() => {
    const now = Date.now();
    return commitments
      .filter((c) => c.status === "scheduled" && new Date(c.scheduledDate).getTime() > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0] ?? null;
  }, [commitments]);

  async function handleComplete() {
    if (!activePact) return;
    if (activePact.proofMethod !== "checkin") {
      toast({
        title: "Submit proof first",
        description: `This pact requires ${activePact.proofMethod} proof in the proof flow.`,
      });
      return;
    }

    const completion = await completeCommitment(activePact.id, {
      method: "checkin",
      confidence: "low",
      text: "I did it.",
      submittedAt: new Date().toISOString(),
    });

    if (completion.status === "completed") {
      setLocation(`/result?commitment_id=${activePact.id}&celebrate=1`);
      return;
    }

    toast({
      title: "Team confirmations pending",
      description: "Your check-in was saved. The pact completes when all teammates confirm.",
    });
    setLocation("/momentum");
  }

  async function handleCantDoIt() {
    if (!activePact) return;
    await markMissed(activePact.id);
    setLocation(`/result?commitment_id=${activePact.id}`);
  }

  return (
    <div className="ls-screen px-5 py-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-purple-400">
              Lockstep
            </div>
            <h1 className="text-3xl font-black mt-1">
              Momentum
            </h1>
          </div>

          <div className="ls-card px-4 py-2 text-sm">
            🔥 {creditBalance} credits
          </div>
        </header>

        {activePact ? (
          <CinematicActivePact pact={activePact} onComplete={handleComplete} onCantDoIt={handleCantDoIt} />
        ) : (
          <div className="ls-card p-6 text-center space-y-5">
            <div className="text-xs uppercase tracking-[0.35em] text-red-400">
              Nothing Proven
            </div>

            <h2 className="text-4xl font-black leading-tight">
              YOU HAVEN&apos;T PROVEN ANYTHING YET
            </h2>

            <p className="text-zinc-400">
              Start with one small pact.
            </p>

            <Button className="w-full h-14 ls-button-primary font-black" onClick={() => setLocation("/onboarding")}>
              CREATE FIRST PACT
            </Button>
          </div>
        )}

        <RealityFeedbackCard feedback={realityFeedback} />
        <Button className="w-full font-black" variant="outline" onClick={() => setLocation("/leaderboard")}>VIEW MONTHLY LEADERBOARD</Button>
        <StreakIdentityCard streak={streakIdentity} />
        <IntegrityIdentityCard score={integrityScore} identity={integrityIdentity} />
      </div>
    </div>
  );
}
