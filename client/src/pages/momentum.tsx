import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/mock-data";
import { getRecoveryPlan } from "@/lib/identity-recovery";
import { getIntegrityIdentity } from "@/lib/integrity-identity";
import { buildRealityFeedback } from "@/lib/reality-feedback";
import { hasSeenMicroTooltip, markMicroTooltipSeen } from "@/lib/micro-tooltips";
import IdentityRecoveryCard from "@/components/identity-recovery-card";
import IntegrityIdentityCard from "@/components/integrity-identity-card";
import RealityFeedbackCard from "@/components/reality-feedback-card";
import StreakIdentityCard from "@/components/streak-identity-card";
import { buildStreakIdentity } from "@/lib/streak-identity";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { buildPactInviteDeepLink, buildPactInviteShareUrl } from "@/lib/deeplink";

export default function MomentumPage() {
  const { commitments, psychProfile, behaviorProfile } = useApp();
  const [, setLocation] = useLocation();
  const liveBannerActive = typeof window !== "undefined" && window.localStorage.getItem("lockstep_onboarding_live_banner_v1") === "true";
  const firstLockInTooltipSeen = hasSeenMicroTooltip("firstLockIn");
  const showFirstLockInTooltip = commitments.length > 0 && !firstLockInTooltipSeen;
  const integrityScore = useMemo(() => Math.round((behaviorProfile.completionRate ?? 0) * 100), [behaviorProfile.completionRate]);
  const integrityIdentity = useMemo(() => getIntegrityIdentity(integrityScore), [integrityScore]);
  const recoveryPlan = useMemo(() => getRecoveryPlan(integrityScore), [integrityScore]);
  const realityFeedback = useMemo(() => {
    return buildRealityFeedback(commitments);
  }, [commitments]);
  const streakIdentity = useMemo(() => buildStreakIdentity(commitments), [commitments]);

  useEffect(() => {
    if (!liveBannerActive || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      window.localStorage.removeItem("lockstep_onboarding_live_banner_v1");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [liveBannerActive]);

  // Get the primary pact (next upcoming commitment)
  const primaryPact = useMemo(() => {
    const now = new Date();
    return commitments
      .filter(c => c.status === 'scheduled' && new Date(c.scheduledDate) > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
  }, [commitments]);

  // Enhanced psychLine with streak break pressure
  const [copiedInviteTarget, setCopiedInviteTarget] = useState<string | null>(null);

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
    <div className="flex flex-col md:flex-row gap-8 container max-w-6xl mx-auto px-4 py-8">
      {/* Right rail */}
      <div className="w-full md:w-1/3 space-y-6">
        <IdentityRecoveryCard plan={recoveryPlan} />
        <RealityFeedbackCard feedback={realityFeedback} />
        <IntegrityIdentityCard score={integrityScore} identity={integrityIdentity} />
        <StreakIdentityCard streak={streakIdentity} />

        {/* Score Transparency */}
        <div className="border border-zinc-800 bg-zinc-950/30 p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500">How scoring works</div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <span className="font-bold">+2</span>
              <span className="text-zinc-300">pact completed</span>
            </div>
            <div className="flex items-center gap-2 text-red-400">
              <span className="font-bold">−3</span>
              <span className="text-zinc-300">pact missed</span>
            </div>
            <div className="flex items-center gap-2 text-orange-400">
              <span className="font-bold">0</span>
              <span className="text-zinc-300">streak resets to 0 on any miss</span>
            </div>
          </div>
        </div>
      </div>
      {/* Main content */}
      <div className="w-full md:w-2/3">
        <div className="text-2xl font-bold mb-4">Momentum</div>
        <div className="mb-4 text-zinc-300">{psychLine}</div>

        {showFirstLockInTooltip && (
          <button
            type="button"
            onClick={() => markMicroTooltipSeen("firstLockIn")}
            className="mb-4 inline-flex items-center rounded-none border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200"
          >
            This is now at risk
          </button>
        )}

        {liveBannerActive && (
          <div className="mb-4 border border-red-500/40 bg-red-950/20 p-5 space-y-2 rounded-xl">
            <div className="text-xs uppercase tracking-widest text-red-300">This is live now.</div>
            <div className="text-base text-white">You said you'd do this. Now execute.</div>
            <div className="text-sm text-zinc-400">One move: finish before deadline.</div>
          </div>
        )}

        {/* Primary Pact */}
        {primaryPact && (
          <div className="border border-zinc-800 bg-zinc-950/30 p-6 space-y-4 rounded-xl">
            <div className="text-lg font-bold">What matters now</div>
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

            {!!primaryPact.invitedWitnesses?.length && (
              <div className="border border-zinc-800 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Invited witnesses</div>
                <div className="mt-2 space-y-2">
                  {primaryPact.invitedWitnesses.map((name) => {
                    const shareUrl = buildPactInviteShareUrl(primaryPact.id, name, "act");
                    const deepLink = buildPactInviteDeepLink(primaryPact.id, name, "act");
                    const shareText = `${name}, witness my pact and keep me accountable.\n\nWeb: ${shareUrl}\nApp: ${deepLink}`;
                    return (
                      <div key={name} className="border border-zinc-700 bg-black/20 p-3">
                        <div className="text-sm text-zinc-200 font-semibold">{name}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await navigator.clipboard.writeText(shareUrl);
                              setCopiedInviteTarget(name);
                              setTimeout(() => setCopiedInviteTarget(null), 1500);
                            }}
                          >
                            {copiedInviteTarget === name ? "COPIED" : "COPY INVITE LINK"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                                await navigator.share({ title: "Witness my pact", text: shareText });
                              } else {
                                await navigator.clipboard.writeText(shareText);
                                setCopiedInviteTarget(name);
                                setTimeout(() => setCopiedInviteTarget(null), 1500);
                              }
                            }}
                          >
                            SHARE
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {primaryPact.teamChallenge?.enabled && (
              <div className="border border-violet-900/50 bg-violet-950/20 p-4">
                <div className="text-xs uppercase tracking-widest text-violet-300">Team challenge</div>
                <div className="mt-1 text-sm text-zinc-200">
                  Team: You{primaryPact.teamChallenge.memberNames.length ? `, ${primaryPact.teamChallenge.memberNames.join(", ")}` : ""}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Total stake {primaryPact.teamChallenge.totalCredits} credits · Your share {primaryPact.teamChallenge.splitCreditsPerMember} credits
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Confirmed: {(primaryPact.teamChallenge.confirmedBy ?? []).length} / {primaryPact.teamChallenge.memberNames.length + 1}
                </div>
                <div className="mt-3 space-y-2">
                  {primaryPact.teamChallenge.memberNames.map((name) => {
                    const shareUrl = buildPactInviteShareUrl(primaryPact.id, name, "act");
                    const deepLink = buildPactInviteDeepLink(primaryPact.id, name, "act");
                    const shareText = `${name}, confirm our team pact commitment.\n\nWeb: ${shareUrl}\nApp: ${deepLink}`;
                    const alreadyConfirmed = (primaryPact.teamChallenge?.confirmedBy ?? []).includes(name);
                    return (
                      <div key={name} className="border border-violet-900/40 bg-black/20 p-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-zinc-100">{name}</div>
                          <div className="text-[11px] text-zinc-400">{alreadyConfirmed ? "✓ Confirmed" : "Awaiting confirmation"}</div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await navigator.clipboard.writeText(shareUrl);
                              setCopiedInviteTarget(`team-${name}`);
                              setTimeout(() => setCopiedInviteTarget(null), 1500);
                            }}
                          >
                            {copiedInviteTarget === `team-${name}` ? "COPIED" : "COPY LINK"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                                await navigator.share({ title: "Team pact confirmation", text: shareText });
                              } else {
                                await navigator.clipboard.writeText(shareText);
                                setCopiedInviteTarget(`team-${name}`);
                                setTimeout(() => setCopiedInviteTarget(null), 1500);
                              }
                            }}
                          >
                            SHARE
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {!primaryPact && (
          <div className="border border-zinc-800 bg-zinc-950/40 p-8 space-y-4 rounded-xl text-center">
            <div className="text-xs uppercase tracking-[0.35em] text-red-500">Nothing Proven</div>
            <div className="text-3xl font-black leading-tight">YOU HAVEN&apos;T PROVEN ANYTHING YET</div>
            <div className="text-zinc-400 text-sm">Start with one small pact. Make it real.</div>
            <Button
              className="mt-2 w-full h-14 ls-button-primary font-black"
              onClick={() => setLocation("/onboarding")}
            >
              CREATE FIRST PACT
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
