import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/mock-data";
import { AlertTriangle, Brain, TrendingDown, RefreshCw } from "lucide-react";

export default function MissedPage() {
  const [, setLocation] = useLocation();
  const { behaviorProfile, psychProfile, commitments } = useApp();
  const latestMissedWithPact = [...commitments]
    .filter((c) => c.status === "missed")
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];

  const pactSizeBadge =
    latestMissedWithPact?.intent?.pact_size_level === "tiny"
      ? "border-yellow-500/50 text-yellow-300 bg-yellow-500/10"
      : latestMissedWithPact?.intent?.pact_size_level === "small"
        ? "border-sky-500/50 text-sky-300 bg-sky-500/10"
        : latestMissedWithPact?.intent?.pact_size_level === "expanded"
          ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10"
          : "border-zinc-700 text-zinc-300 bg-zinc-900/50";

  const latestMissed = [...commitments]
    .filter((c) => c.status === "missed")
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];

  const totalMissed = commitments.filter((c) => c.status === "missed").length;
  const totalCompleted = commitments.filter((c) => c.status === "completed").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950/20 to-black">
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-heading font-bold text-red-400">YOU DIDN'T DO IT.</h1>
          <p className="text-muted-foreground text-lg">The deadline passed. You're still here. It's done.</p>
        </div>

        {/* What happened */}
        <Card className="rounded-none border border-red-800/60 bg-red-950/30">
          <CardHeader>
            <CardTitle className="text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              What You Said vs. What You Did
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-red-200">
            {latestMissed ? (
              <p className="font-semibold">
                You locked in:{" "}
                <span className="text-white">
                  {(latestMissed as any).intent?.goal ?? (latestMissed as any).intent?.text ?? "a commitment"}
                </span>
              </p>
            ) : (
              <p className="font-semibold">You locked in a commitment. Then you didn't follow through.</p>
            )}
            <p className="text-sm text-red-300/80">That's not a judgment. That's a fact.</p>
            <div className="flex gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-black text-red-400">{totalMissed}</p>
                <p className="text-xs text-red-400/70 uppercase tracking-wide">Missed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-400">{totalCompleted}</p>
                <p className="text-xs text-emerald-400/70 uppercase tracking-wide">Honored</p>
              </div>
              {behaviorProfile && (
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-400">
                    {Math.round(behaviorProfile.completionRate * 100)}%
                  </p>
                  <p className="text-xs text-amber-400/70 uppercase tracking-wide">Honor Rate</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Psych Engine — Identity Risk + Failure Reason */}
        {behaviorProfile && (
          <Card className="rounded-none border border-purple-800/50 bg-purple-950/20">
            <CardHeader>
              <CardTitle className="text-purple-300 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Psych Engine — Result Read
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-purple-400 font-bold">
                  Identity Risk
                </p>
                <p className="text-sm text-purple-100">{psychProfile?.identity_risk ?? behaviorProfile.psych.identity_risk}</p>
              </div>
              {behaviorProfile.commonFailureReason !== "no data yet" && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-red-400 font-bold">
                    Common Failure Pattern
                  </p>
                  <p className="text-sm text-red-200 capitalize">{behaviorProfile.commonFailureReason}</p>
                </div>
              )}
              {behaviorProfile.riskPatterns.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {behaviorProfile.riskPatterns.map((r) => (
                    <Badge key={r} variant="outline" className="text-xs border-red-700/60 text-red-400">
                      {r}
                    </Badge>
                  ))}
                </div>
              )}
              {latestMissedWithPact?.intent?.pact_size_reason && (
                <div className="space-y-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-widest border ${pactSizeBadge}`}>
                    Pact Size: {latestMissedWithPact.intent.pact_size_level ?? "standard"}
                  </span>
                  <p className="text-xs text-zinc-400">{latestMissedWithPact.intent.pact_size_reason}</p>
                </div>
              )}
              {behaviorProfile.worstTimeOfDay && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  Failure zone:{" "}
                  <span className="text-red-300 font-semibold">{behaviorProfile.worstTimeOfDay}</span>
                  {" "}— avoid scheduling hard pacts then.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recovery signal */}
        {behaviorProfile && (
          <Card className="rounded-none border border-sky-800/50 bg-sky-950/20">
            <CardContent className="pt-5 space-y-2">
              <p className="text-xs uppercase tracking-widest text-sky-400 font-bold flex items-center gap-2">
                <RefreshCw className="w-3 h-3" />
                Recovery Signal
              </p>
              <p className="text-sm text-sky-100">{psychProfile?.best_leverage_point ?? behaviorProfile.psych.best_leverage_point}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          <Button className="w-full rounded-none font-bold h-14" onClick={() => setLocation("/capture")}>
            SET A NEW COMMITMENT
          </Button>
          <Button
            variant="secondary"
            className="w-full rounded-none font-bold"
            onClick={() => setLocation("/dashboard")}
          >
            RETURN TO DASHBOARD
          </Button>
        </div>
      </div>
    </div>
  );
}
