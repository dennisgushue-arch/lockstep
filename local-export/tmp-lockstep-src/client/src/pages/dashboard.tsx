import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  differenceInMinutes,
  formatDistanceToNowStrict,
  isBefore,
} from "date-fns";

type CommitmentCard = {
  id: string;
  scheduled_at: string;
  status: "active" | "completed" | "failed";
  stake_amount: number | null;
  consequence_type: string | null;
  action?: string | null;
};

function badgeFor(c: CommitmentCard) {
  const now = Date.now();
  const due = new Date(c.scheduled_at).getTime();
  const mins = Math.floor((due - now) / 60000);

  if (c.status === "completed") {
    return { label: "COMPLETED", cls: "border-green-500 text-green-300" };
  }
  if (c.status === "failed") {
    return { label: "FAILED", cls: "border-red-500 text-red-300" };
  }
  if (mins < 0) return { label: "OVERDUE", cls: "border-red-500 text-red-300" };
  if (mins <= 180) {
    return { label: "DUE SOON", cls: "border-yellow-500 text-yellow-300" };
  }
  return { label: "ACTIVE", cls: "border-zinc-600 text-zinc-300" };
}

export default function Dashboard() {
  const { commitments, completeCommitment, markMissed } = useApp();
  const [, setLocation] = useLocation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [loadingFail, setLoadingFail] = useState(false);

  const cards = useMemo<CommitmentCard[]>(() => {
    return commitments.map((c) => {
      const status = c.status === "scheduled"
        ? "active"
        : c.status === "missed"
          ? "failed"
          : "completed";

      return {
        id: c.id,
        scheduled_at: c.scheduledDate,
        status,
        stake_amount: c.creditsCost ?? 0,
        consequence_type: c.consequenceType ?? null,
        action: c.intent?.goal ?? c.intent?.text ?? "Pact",
      };
    });
  }, [commitments]);

  const sortedCards = useMemo(() => {
    return [...cards].sort(
      (a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at)
    );
  }, [cards]);

  useEffect(() => {
    if (!selectedId && sortedCards[0]?.id) {
      setSelectedId(sortedCards[0].id);
    }
  }, [selectedId, sortedCards]);

  const selected = useMemo(
    () => sortedCards.find((c) => c.id === selectedId) ?? null,
    [sortedCards, selectedId]
  );

  const nextUp = useMemo(() => {
    const active = sortedCards.filter((c) => c.status === "active");
    return (
      active.sort(
        (a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at)
      )[0] ?? null
    );
  }, [sortedCards]);

  const stats = useMemo(() => {
    const now = new Date();
    const active = sortedCards.filter((c) => c.status === "active");
    const overdue = active.filter((c) => isBefore(new Date(c.scheduled_at), now));
    const dueSoon = active.filter((c) => {
      const mins = differenceInMinutes(new Date(c.scheduled_at), now);
      return mins >= 0 && mins <= 180;
    });

    const totalStaked = sortedCards.reduce((sum, c) => {
      return sum + (c.stake_amount ?? 0);
    }, 0);

    const completedLast7 = sortedCards.filter((c) => {
      if (c.status !== "completed") return false;
      const minsAgo = differenceInMinutes(now, new Date(c.scheduled_at));
      return minsAgo <= 7 * 24 * 60;
    }).length;

    return {
      activeCount: active.length,
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
      totalStaked,
      completedLast7,
    };
  }, [sortedCards]);

  async function markCompleted(commitmentId: string) {
    await completeCommitment(commitmentId);
  }

  async function markFailed(commitmentId: string) {
    await markMissed(commitmentId);
  }

  return (
    <div className="relative">
      <div className="noise-bg" />

      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-glow">
              DASHBOARD
            </h1>
            <p className="text-muted-foreground text-lg">
              Next pact due:{" "}
              <span className="text-white font-semibold">
                {nextUp
                  ? formatDistanceToNowStrict(new Date(nextUp.scheduled_at), {
                      addSuffix: true,
                    })
                  : "none"}
              </span>
            </p>
          </div>

          <Button
            className="rounded-none h-12 px-6 text-lg font-bold"
            onClick={() => setLocation("/capture")}
          >
            + NEW PACT
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-panel p-4 brutal-shadow">
            <div className="text-xs uppercase tracking-widest opacity-60">
              Active Pacts
            </div>
            <div className="text-3xl font-bold">{stats.activeCount}</div>
          </div>

          <div className="glass-panel p-4 brutal-shadow">
            <div className="text-xs uppercase tracking-widest opacity-60">
              At Risk
            </div>
            <div className="text-3xl font-bold text-yellow-300">
              {stats.dueSoonCount}
            </div>
            <div className="text-xs opacity-60 mt-1">
              Overdue:{" "}
              <span className="text-red-300 font-semibold">
                {stats.overdueCount}
              </span>
            </div>
          </div>

          <div className="glass-panel p-4 brutal-shadow">
            <div className="text-xs uppercase tracking-widest opacity-60">
              Streak (7d)
            </div>
            <div className="text-3xl font-bold">{stats.completedLast7}</div>
            <div className="text-xs opacity-60 mt-1">completed pacts</div>
          </div>

          <div className="glass-panel p-4 brutal-shadow">
            <div className="text-xs uppercase tracking-widest opacity-60">
              Total Staked
            </div>
            <div className="text-3xl font-bold">${stats.totalStaked}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest opacity-60">
                Pact Timeline
              </div>
            </div>

            {sortedCards.map((c) => {
              const b = badgeFor(c);
              const isSelected = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "w-full text-left glass-panel p-5 border border-zinc-800 hover:border-zinc-600 transition brutal-shadow",
                    isSelected && "border-white"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xl font-bold">
                      {c.action ?? "Pact"}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-1 border rounded-none",
                        b.cls
                      )}
                    >
                      {b.label}
                    </span>
                  </div>

                  <div className="text-sm opacity-80 mt-2">
                    Deadline{" "}
                    <span className="underline underline-offset-4">
                      {formatDistanceToNowStrict(new Date(c.scheduled_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <div className="text-xs opacity-60 mt-2">
                    Stake: {c.stake_amount ? `$${c.stake_amount}` : "$0"} ·{" "}
                    {c.consequence_type ?? "money"}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      className="rounded-none"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLocation(`/journal?commitment_id=${c.id}`);
                      }}
                    >
                      CHECK-IN
                    </Button>

                    <Button
                      className="rounded-none"
                      disabled={c.status === "completed"}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLoadingComplete(true);
                        try {
                          await markCompleted(c.id);
                        } finally {
                          setLoadingComplete(false);
                        }
                      }}
                    >
                      {loadingComplete ? "…" : "COMPLETE"}
                    </Button>
                  </div>
                </button>
              );
            })}

            {!sortedCards.length && (
              <div className="glass-panel p-6 opacity-70">
                No pacts yet. Create your first intent.
              </div>
            )}
          </div>

          <div className="glass-panel p-6 space-y-4 brutal-shadow">
            <div className="text-xs uppercase tracking-widest opacity-60">
              Focus Panel
            </div>

            {!selected ? (
              <div className="opacity-70">Select a pact.</div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {selected.action ?? "Pact"}
                </div>

                <div className="text-sm opacity-80">
                  Deadline{" "}
                  <span className="underline underline-offset-4">
                    {formatDistanceToNowStrict(new Date(selected.scheduled_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <div className="border border-zinc-800 p-4 bg-black/30">
                  <div className="text-xs uppercase tracking-widest opacity-60">
                    Today’s move
                  </div>
                  <div className="text-sm mt-2">
                    Do the smallest step that makes this real. No excuses.
                  </div>
                </div>

                <div className="border border-zinc-800 p-4 bg-black/30">
                  <div className="text-xs uppercase tracking-widest opacity-60">
                    Proof prompt
                  </div>
                  <div className="text-sm mt-2">
                    What can you show by tonight that proves you moved?
                  </div>
                </div>

                <div className="border border-zinc-800 p-4 bg-black/30">
                  <div className="text-xs uppercase tracking-widest opacity-60">
                    Stakes
                  </div>
                  <div className="text-lg mt-2">
                    Lose{" "}
                    <span className="text-red-400 font-bold">
                      ${selected.stake_amount ?? 0}
                    </span>{" "}
                    via{" "}
                    <span className="font-semibold">
                      {selected.consequence_type ?? "money"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="secondary"
                    className="rounded-none h-12"
                    onClick={() => setLocation(`/journal?commitment_id=${selected.id}`)}
                  >
                    CHECK-IN
                  </Button>

                  <Button
                    variant="destructive"
                    className="rounded-none h-12"
                    disabled={loadingFail || selected.status === "failed"}
                    onClick={async () => {
                      setLoadingFail(true);
                      try {
                        await markFailed(selected.id);
                      } finally {
                        setLoadingFail(false);
                      }
                    }}
                  >
                    {loadingFail ? "…" : "FAIL"}
                  </Button>
                </div>
              </>
            )}

            <div className="pt-4 text-xs italic opacity-60">
              “Delay is a decision.”
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
