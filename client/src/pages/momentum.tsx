import React, { useMemo } from "react";
import { useApp } from "@/lib/mock-data";
import { getRecoveryPlan } from "@/lib/identity-recovery";
import IdentityRecoveryCard from "@/components/identity-recovery-card";
import StreakIdentityCard from "@/components/streak-identity-card";
import { buildStreakIdentity } from "@/lib/streak-identity";

export default function MomentumPage() {
  const { commitments, psychProfile, behaviorProfile } = useApp();
  const integrityScore = useMemo(() => Math.round((behaviorProfile.completionRate ?? 0) * 100), [behaviorProfile.completionRate]);
  const recoveryPlan = useMemo(() => getRecoveryPlan(integrityScore), [integrityScore]);
  const streakIdentity = useMemo(() => buildStreakIdentity(commitments), [commitments]);

  // Get the primary pact (next upcoming commitment)
  const primaryPact = useMemo(() => {
    const now = new Date();
    return commitments
      .filter(c => c.status === 'scheduled' && new Date(c.scheduledDate) > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
  }, [commitments]);

  // Enhanced psychLine with streak break pressure
  const psychLine = [
    psychProfile?.next_pressure_line,
    streakIdentity.currentStreak >= 2
      ? `Miss this, and your kept-in-a-row count resets from ${streakIdentity.currentStreak} to 0.`
      : null,
    behaviorProfile?.psych.next_pressure_line,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Right rail */}
      <div className="w-full md:w-1/3 space-y-6">
        <IdentityRecoveryCard plan={recoveryPlan} />
        <StreakIdentityCard streak={streakIdentity} />
        {/* Identity, Psych Engine, Weekly Signal would go here */}
      </div>
      {/* Main content */}
      <div className="w-full md:w-2/3">
        <div className="text-2xl font-bold mb-4">Momentum Center</div>
        <div className="mb-4 text-zinc-300">{psychLine}</div>

        {/* Primary Pact */}
        {primaryPact && (
          <div className="border border-zinc-800 bg-zinc-950/30 p-6 space-y-4 rounded-xl">
            <div className="text-lg font-bold">Primary Pact</div>
            <div className="text-sm text-zinc-300">{primaryPact.actionText || primaryPact.intent.text}</div>
            <div className="text-xs text-zinc-500">
              Due: {new Date(primaryPact.scheduledDate).toLocaleString()}
            </div>
            <div className="text-xs text-zinc-500">
              Stake: {primaryPact.creditsCost} credits
            </div>

            {primaryPact.witness?.name && (
              <div className="border border-zinc-800 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-widest text-zinc-500">
                  Witness
                </div>
                <div className="mt-2 text-sm text-zinc-200">
                  {primaryPact.witness.name}
                  {primaryPact.witness.relationship
                    ? ` • ${primaryPact.witness.relationship}`
                    : ""}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  If this pact is missed, the result becomes shareable.
                </div>
              </div>
            )}
          </div>
        )}

        {!primaryPact && (
          <div className="text-zinc-500">No upcoming pacts. Create one to build momentum!</div>
        )}
      </div>
    </div>
  );
}
