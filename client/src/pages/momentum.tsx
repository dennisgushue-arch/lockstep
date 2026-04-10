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

  // Enhanced psychLine with streak break pressure
  const psychLine = [
    psychProfile?.next_pressure_line,
    streakIdentity.currentStreak >= 2
      ? `Miss this, and your kept-in-a-row count resets from ${streakIdentity.currentStreak} to 0.`
      : null,
    behaviorProfile?.identityPressureLine,
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
        {/* ...rest of momentum content... */}
      </div>
    </div>
  );
}
