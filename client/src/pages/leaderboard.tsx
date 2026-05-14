import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LeaderboardEntry = {
  name: string;
  keptThisMonth: number;
  totalPacts: number;
  challengeParticipations: number;
  isCurrentUser?: boolean;
};

function hashNameToBonus(name: string): number {
  return Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 4;
}

type FilterWindow = "week" | "month" | "all";

export default function LeaderboardPage() {
  const { user, commitments } = useApp();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterWindow>("month");

  const entries = useMemo<LeaderboardEntry[]>(() => {
    const now = new Date();
    const windowStart =
      filter === "week"
        ? now.getTime() - 7 * 24 * 60 * 60 * 1000
        : filter === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        : 0;

    const myCompletedThisMonth = commitments.filter(
      (c) => c.status === "completed" && new Date(c.scheduledDate).getTime() >= windowStart
    ).length;

    const myChallengeParticipations = commitments.filter((c) => c.teamChallenge?.enabled).length;

    const names = new Set<string>();
    commitments.forEach((c) => {
      (c.invitedWitnesses ?? []).forEach((n) => names.add(n));
      (c.teamChallenge?.memberNames ?? []).forEach((n) => names.add(n));
      if (c.witness?.name) names.add(c.witness.name);
    });

    const friends = Array.from(names)
      .filter(Boolean)
      .slice(0, 10)
      .map<LeaderboardEntry>((name) => {
        const mentions = commitments.filter(
          (c) =>
            (c.invitedWitnesses ?? []).includes(name) ||
            (c.teamChallenge?.memberNames ?? []).includes(name) ||
            c.witness?.name === name
        ).length;

        return {
          name,
          keptThisMonth: Math.max(0, myCompletedThisMonth - 1 + (filter === "all" ? 2 : 0) + hashNameToBonus(name) + mentions),
          totalPacts: commitments.length + mentions,
          challengeParticipations: commitments.filter((c) => (c.teamChallenge?.memberNames ?? []).includes(name)).length,
        };
      });

    const currentUserEntry: LeaderboardEntry = {
      name: user?.email?.split("@")[0] || "You",
      keptThisMonth: myCompletedThisMonth,
      totalPacts: commitments.length,
      challengeParticipations: myChallengeParticipations,
      isCurrentUser: true,
    };

    return [currentUserEntry, ...friends]
      .sort((a, b) => b.keptThisMonth - a.keptThisMonth)
      .map((entry, index) => ({ ...entry, rank: index + 1 })) as LeaderboardEntry[];
  }, [commitments, user?.email, filter]);

  return (
    <div className="ls-screen px-5 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="text-xs uppercase tracking-[0.35em] text-violet-400">Social Pressure</div>
          <h1 className="text-4xl font-black">LEADERBOARD</h1>
          <p className="text-zinc-400">
            {filter === "week" ? "This week" : filter === "month" ? "This month" : "All time"}
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {(["week", "month", "all"] as FilterWindow[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className={`font-black uppercase ${filter === f ? "bg-violet-600 hover:bg-violet-700" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "week" ? "WEEK" : f === "month" ? "MONTH" : "ALL TIME"}
            </Button>
          ))}
        </div>

        <div className="ls-card p-5 space-y-3">
          <div className="text-xs uppercase tracking-[0.28em] text-zinc-400">Rankings</div>
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div
                key={`${entry.name}-${idx}`}
                className={`flex items-center justify-between border p-3 ${entry.isCurrentUser ? "border-violet-500/60 bg-violet-950/20" : "border-zinc-800 bg-zinc-950/40"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl font-black w-8 text-center">#{idx + 1}</div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {entry.name}
                      {entry.isCurrentUser && <Badge className="bg-violet-600">You</Badge>}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {entry.totalPacts} total pacts · {entry.challengeParticipations} team challenge{entry.challengeParticipations !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-300">{entry.keptThisMonth}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">kept</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Button className="ls-button-primary font-black" onClick={() => setLocation("/capture")}>CREATE NEW PACT</Button>
          <Button variant="outline" className="font-black" onClick={() => setLocation("/momentum")}>BACK TO MOMENTUM</Button>
        </div>
      </div>
    </div>
  );
}
