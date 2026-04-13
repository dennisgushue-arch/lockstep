import React, { useMemo } from "react";
import { Link } from "wouter";
import { useApp } from "@/lib/mock-data";
import IntegrityIdentityCard from "@/components/integrity-identity-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict, format } from "date-fns";
import { ArrowLeft, TrendingUp, Award, Target, AlertCircle, Brain, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getIntegrityIdentity,
  getIntegrityIdentityPressureLine,
} from "@/lib/integrity-identity";
import { getProofConfidenceLabel, getProofMethodLabel } from "@/lib/proof";

function badgeFor(commitment: any) {
  const deadlineMs = new Date(commitment.scheduledDate).getTime();
  const nowMs = Date.now();
  
  if (commitment.status === "completed") {
    return { label: "HONORED", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" };
  }
  if (commitment.status === "missed") {
    return { label: "FAILED", cls: "bg-red-500/20 text-red-300 border-red-500/50" };
  }
  if (commitment.status === "scheduled" && deadlineMs <= nowMs) {
    return { label: "OVERDUE", cls: "bg-red-500/20 text-red-300 border-red-500/50" };
  }
  return { label: "ACTIVE", cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50" };
}

export function HistoryPage() {
  const { commitments, behaviorProfile } = useApp();

  const stats = useMemo(() => {
    const completed = commitments.filter(c => c.status === "completed").length;
    const failed = commitments.filter(c => c.status === "missed").length;
    const active = commitments.filter(c => c.status === "scheduled").length;
    const totalCredit = completed * (commitments[0]?.creditsCost || 10);
    const lostCredit = failed * (commitments[0]?.creditsCost || 10);
    
    const total = completed + failed;
    const honourRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      completed,
      failed,
      active,
      totalCredit,
      lostCredit,
      integrityScore: completed,
      totalPacts: commitments.length,
      honourRate,
    };
  }, [commitments]);

  const integrityIdentity = useMemo(
    () => getIntegrityIdentity(stats.honourRate),
    [stats.honourRate]
  );

  const identityPressureLine = useMemo(
    () => behaviorProfile.psych.next_pressure_line,
    [behaviorProfile.psych.next_pressure_line]
  );

  const sortedByDate = useMemo(() => {
    return [...commitments].sort(
      (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  }, [commitments]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-slate-950 to-black px-4 py-10 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0 noise-bg" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="border-cyan-600/50 text-cyan-400 hover:bg-cyan-950/30">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">YOUR RECORD</h1>
            <p className="text-lg text-zinc-400">A ledger of your integrity</p>
          </div>
        </div>

        {/* Big stats grid */}
        <div className="grid md:grid-cols-4 gap-4">
          {/* Integrity Identity Card */}
          <IntegrityIdentityCard
            score={stats.honourRate}
            identity={integrityIdentity}
          />

          {/* Honor Rate */}
          <div className="border border-cyan-900/30 bg-gradient-to-br from-cyan-950/40 to-black rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span className="text-xs uppercase tracking-[0.22em] text-cyan-400 font-bold">Honor Rate</span>
            </div>
            <div className="text-5xl font-black text-cyan-400 mb-2">{stats.honourRate}%</div>
            <p className="text-xs text-zinc-500">{stats.completed}/{stats.totalPacts} pacts</p>
          </div>

          {/* Credits Earned */}
          <div className="border border-emerald-900/30 bg-gradient-to-br from-emerald-950/40 to-black rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs uppercase tracking-[0.22em] text-emerald-400 font-bold">Credits Earned</span>
            </div>
            <div className="text-5xl font-black text-emerald-400 mb-2">+{stats.totalCredit}</div>
            <p className="text-xs text-zinc-500">From completed</p>
          </div>

          {/* Credits Lost */}
          <div className="border border-red-900/30 bg-gradient-to-br from-red-950/40 to-black rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-xs uppercase tracking-[0.22em] text-red-400 font-bold">Credits Lost</span>
            </div>
            <div className="text-5xl font-black text-red-400 mb-2">-{stats.lostCredit}</div>
            <p className="text-xs text-zinc-500">{stats.failed} failures</p>
          </div>
        </div>

        {/* Identity Summary — Psych Engine */}
        {behaviorProfile && behaviorProfile.identitySummary.length > 0 && (
          <div className="border border-purple-900/40 bg-gradient-to-br from-purple-950/30 to-black rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-xs uppercase tracking-[0.22em] text-purple-400 font-bold">Identity Summary</span>
              {behaviorProfile.strongestCategory && (
                <Badge variant="outline" className="ml-auto text-xs border-purple-600/50 text-purple-300">
                  Strongest: {behaviorProfile.strongestCategory}
                </Badge>
              )}
              {behaviorProfile.weakestCategory && behaviorProfile.weakestCategory !== behaviorProfile.strongestCategory && (
                <Badge variant="outline" className="text-xs border-red-700/50 text-red-400">
                  Weakest: {behaviorProfile.weakestCategory}
                </Badge>
              )}
            </div>
            <ul className="space-y-2">
              {behaviorProfile.identitySummary.map((line, i) => (
                <li key={i} className="flex gap-3 text-sm text-purple-100">
                  <Flame className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
            {behaviorProfile.bestTimeOfDay && (
              <p className="mt-4 text-xs text-zinc-500">
                Peak execution window:{" "}
                <span className="text-emerald-400 font-semibold">{behaviorProfile.bestTimeOfDay}</span>
              </p>
            )}
          </div>
        )}

        {/* Identity Pressure — Current Status */}
        <div className="border border-blue-900/40 bg-gradient-to-br from-blue-950/30 to-black rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-400" />
            <span className="text-xs uppercase tracking-[0.22em] text-blue-400 font-bold">Current Pressure</span>
          </div>
          <p className="text-sm text-blue-100">{identityPressureLine}</p>
        </div>

        {/* Contract history */}
        <div className="border border-zinc-800/50 rounded-xl bg-gradient-to-b from-zinc-900/30 to-black overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-5 border-b border-zinc-700/30 bg-gradient-to-r from-zinc-900/50 to-transparent">
            <h2 className="text-xl font-black">PACT LEDGER</h2>
            <p className="text-sm text-zinc-400">Every promise you made</p>
          </div>

          <div className="divide-y divide-zinc-900/50 max-h-[700px] overflow-y-auto">
            {sortedByDate.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No pacts yet. Return to dashboard to create one.</div>
            ) : (
              sortedByDate.map((commitment) => {
                const b = badgeFor(commitment);
                const isHonored = commitment.status === "completed";
                const isFailed = commitment.status === "missed";

                return (
                  <div
                    key={commitment.id}
                    className={cn(
                      "px-6 py-5 hover:bg-zinc-900/20 transition-all duration-300 border-l-4",
                      isHonored && "border-l-emerald-500 bg-emerald-950/10",
                      isFailed && "border-l-red-500 bg-red-950/10",
                      !isHonored && !isFailed && "border-l-cyan-500 bg-cyan-950/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-lg">
                          {commitment.intent?.first_action ?? commitment.intent?.text ?? "Pact"}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          Due: {format(new Date(commitment.scheduledDate), "PPP 'at' p")}
                        </p>
                      </div>

                      <span className={cn("text-[10px] px-2 py-1 border rounded font-bold tracking-widest whitespace-nowrap", b.cls)}>
                        {b.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <div>
                          <span className="text-zinc-500">Stake:</span>{" "}
                          <span className="font-bold text-red-400">{commitment.creditsCost} credits</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Consequence:</span>{" "}
                          <span className="font-bold capitalize">{commitment.consequenceType || "none"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Proof:</span>{" "}
                          <span className="font-bold">{getProofMethodLabel(commitment.proofMethod ?? "checkin")}</span>
                          {commitment.proofSubmission?.confidence && (
                            <span className="text-zinc-400"> · {getProofConfidenceLabel(commitment.proofSubmission.confidence)}</span>
                          )}
                        </div>
                      </div>

                      {isHonored && (
                        <div className="text-right">
                          <div className="text-xs text-zinc-500">Outcome</div>
                          <div className="text-2xl font-black text-emerald-400">+{commitment.creditsCost}</div>
                        </div>
                      )}

                      {isFailed && (
                        <div className="text-right">
                          <div className="text-xs text-zinc-500">Outcome</div>
                          <div className="text-2xl font-black text-red-400">-{commitment.creditsCost}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-zinc-500 font-mono">
                      {commitment.id.slice(0, 8)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Call to action */}
        <div className="border border-cyan-900/30 rounded-xl bg-gradient-to-br from-cyan-950/20 via-black to-black p-8 text-center space-y-4">
          <p className="text-lg text-zinc-300">
            This ledger is proof.
          </p>
          <p className="text-zinc-400">
            Every pact you honor builds your integrity score. Every one you break diminishes it.
          </p>
          <p className="text-sm text-zinc-500">
            You are what you do when nobody is watching.
          </p>
          <Link href="/dashboard">
            <Button className="gap-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:scale-105">
              <Target className="w-4 h-4" />
              MAKE ANOTHER PACT
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;
