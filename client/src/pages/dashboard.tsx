import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import IntegrityIdentityCard from "@/components/integrity-identity-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  getAdaptiveProofPolicy,
  getProofConfidence,
  getProofConfidenceLabel,
  getProofMethodLabel,
  validateTextProofAgainstTask,
  type ProofSubmission,
} from "@/lib/proof";
import {
  getIntegrityIdentity,
  getIntegrityIdentityPressureLine,
} from "@/lib/integrity-identity";
import {
  differenceInMinutes,
  endOfWeek,
  formatDistanceToNowStrict,
  isBefore,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { getRecoveryPlan } from "@/lib/identity-recovery";
import IdentityRecoveryCard from "@/components/identity-recovery-card";

type CommitmentCard = {
  id: string;
  scheduled_at: string;
  status: "active" | "completed" | "failed";
  stake_amount: number | null;
  consequence_type: string | null;
  proof_method: "checkin" | "photo" | "text" | "witness";
  action?: string | null;
  pact?: string | null;
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

function formatCategoryLabel(value: string | null | undefined) {
  if (!value) return "No pattern yet";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTimeLabel(value: string | null | undefined) {
  if (!value) return "No pattern yet";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function summarizeFailurePattern(value: string) {
  const lower = value.toLowerCase();

  if (lower.includes("deadline drift")) return "Deadline drift";
  if (lower.includes("repetition trap")) return "Avoidance";
  if (lower.includes("under-execution")) return "Avoidance";
  if (lower.includes("unclear closure")) return "Weak proof";
  if (lower.includes("insufficient data")) return "Startup fragility";

  return "Avoidance";
}

export default function Dashboard() {
  const { commitments, completeCommitment, markMissed, behaviorProfile, psychProfile } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [loadingFail, setLoadingFail] = useState(false);
  const [proofText, setProofText] = useState("");
  const [checkinConfirmed, setCheckinConfirmed] = useState(false);
  const [witnessConfirmed, setWitnessConfirmed] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const integrityScore = useMemo(
    () => Math.round((behaviorProfile.completionRate ?? 0) * 100),
    [behaviorProfile.completionRate]
  );

  const integrityIdentity = useMemo(
    () => getIntegrityIdentity(integrityScore),
    [integrityScore]
  );

  const identityPressureLine = useMemo(
    () => behaviorProfile.psych.next_pressure_line,
    [behaviorProfile.psych.next_pressure_line]
  );

  const recoveryPlan = useMemo(() => getRecoveryPlan(integrityScore), [integrityScore]);

  const adaptiveProofPolicy = useMemo(
    () => getAdaptiveProofPolicy(integrityScore),
    [integrityScore]
  );

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
        proof_method: c.proofMethod ?? "checkin",
        action: c.intent?.goal ?? c.intent?.text ?? "Pact",
        pact: c.intent?.text ?? c.actionText ?? c.intent?.goal ?? "Pact",
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

  const selectedCommitment = useMemo(
    () => commitments.find((c) => c.id === selectedId) ?? null,
    [commitments, selectedId]
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

  const weeklyReality = useMemo(() => {
    const now = new Date();
    const weekStartsOn = 1;
    const thisWeekStart = startOfWeek(now, { weekStartsOn });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn });

    const isInWindow = (date: Date, start: Date, end: Date) => date >= start && date <= end;

    const currentWeekPacts = commitments.filter((commitment) => {
      const dueDate = new Date(commitment.scheduledDate);
      if (Number.isNaN(dueDate.getTime())) return false;
      if (!isInWindow(dueDate, thisWeekStart, thisWeekEnd)) return false;
      return commitment.status !== "scheduled" || dueDate <= now;
    });

    const kept = currentWeekPacts.filter((commitment) => commitment.status === "completed").length;
    const total = currentWeekPacts.length;

    const previousRates = [1, 2, 3]
      .map((weeksAgo) => {
        const start = startOfWeek(subWeeks(now, weeksAgo), { weekStartsOn });
        const end = endOfWeek(subWeeks(now, weeksAgo), { weekStartsOn });
        const windowPacts = commitments.filter((commitment) => {
          const dueDate = new Date(commitment.scheduledDate);
          if (Number.isNaN(dueDate.getTime())) return false;
          return isInWindow(dueDate, start, end) && commitment.status !== "scheduled";
        });

        if (!windowPacts.length) return null;
        const completed = windowPacts.filter((commitment) => commitment.status === "completed").length;
        return completed / windowPacts.length;
      })
      .filter((rate): rate is number => rate !== null);

    const currentRate = total > 0 ? kept / total : 0;
    const baselineRate = previousRates.length > 0
      ? previousRates.reduce((sum, rate) => sum + rate, 0) / previousRates.length
      : null;

    let baselineLine = "Set more pacts this week so the pattern becomes visible.";
    if (baselineRate !== null && total > 0) {
      if (currentRate + 0.05 < baselineRate) {
        baselineLine = "This is below your normal.";
      } else if (currentRate - 0.05 > baselineRate) {
        baselineLine = "This is above your normal.";
      } else {
        baselineLine = "This is right on your normal.";
      }
    } else if (total > 0) {
      baselineLine = kept === total ? "Clean week so far. Keep the pressure on." : "This week is setting your baseline.";
    }

    const missedByCategory = commitments.reduce<Record<string, number>>((acc, commitment) => {
      if (commitment.status !== "missed") return acc;
      const category = commitment.intent?.category || "other";
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});

    const mostMissedCategory = Object.entries(missedByCategory)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? behaviorProfile.weakestCategory;

    return {
      kept,
      total,
      baselineLine,
      mostMissedCategory,
      bestTime: behaviorProfile.bestTimeOfDay,
      weakestPattern: summarizeFailurePattern(behaviorProfile.commonFailureReason),
      patternCallout: behaviorProfile.worstTimeOfDay
        ? `You miss more in the ${behaviorProfile.worstTimeOfDay}.`
        : "Your miss pattern is still forming. One more week will expose it.",
    };
  }, [behaviorProfile.bestTimeOfDay, behaviorProfile.commonFailureReason, behaviorProfile.weakestCategory, behaviorProfile.worstTimeOfDay, commitments]);

  async function markCompleted(commitmentId: string) {
    await completeCommitment(commitmentId);
  }

  async function readImageAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleProofFileChange(file: File | null) {
    if (!file) {
      setPhotoDataUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image for photo proof.",
        variant: "destructive",
      });
      return;
    }

    const dataUrl = await readImageAsDataUrl(file);
    setPhotoDataUrl(dataUrl);
  }

  async function completeWithProof(commitmentId: string) {
    const commitment = commitments.find((c) => c.id === commitmentId);
    if (!commitment) return;

    const method = commitment.proofMethod ?? "checkin";
    const actionText = commitment.actionText || commitment.intent?.text || "";
    const confidence = getProofConfidence(method);
    // Tier enforcement: block if proof method is weaker than the current minimum
    const methodOrder: Array<"checkin" | "photo" | "text" | "witness"> = ["checkin", "photo", "text", "witness"];
    const methodRank = methodOrder.indexOf(method);
    const minRank = methodOrder.indexOf(adaptiveProofPolicy.minimumMethod);
    if (adaptiveProofPolicy.required && methodRank < minRank) {
      toast({
        title: "Stronger proof required",
        description: `${adaptiveProofPolicy.nudgeMessage} Minimum: ${getProofMethodLabel(adaptiveProofPolicy.minimumMethod)}.`,
        variant: "destructive",
      });
      return;
    }
    let proofSubmission: ProofSubmission | null = null;

    if (method === "checkin") {
      if (!checkinConfirmed) {
        toast({
          title: "Confirm completion",
          description: "Check “I did it” to submit check-in proof.",
          variant: "destructive",
        });
        return;
      }

      proofSubmission = {
        method,
        confidence,
        text: "I did it.",
        submittedAt: new Date().toISOString(),
      };
    }

    if (method === "photo") {
      if (!photoDataUrl) {
        toast({
          title: "Photo required",
          description: "Upload a photo to complete this pact.",
          variant: "destructive",
        });
        return;
      }

      proofSubmission = {
        method,
        confidence,
        photoDataUrl,
        submittedAt: new Date().toISOString(),
      };
    }

    if (method === "text") {
      if (!proofText.trim()) {
        toast({
          title: "Text proof required",
          description: "Describe what you completed.",
          variant: "destructive",
        });
        return;
      }

      proofSubmission = {
        method,
        confidence,
        text: proofText.trim(),
        submittedAt: new Date().toISOString(),
        aiValidation: validateTextProofAgainstTask(actionText, proofText.trim()),
      };
    }

    if (method === "witness") {
      if (!witnessConfirmed) {
        toast({
          title: "Witness confirmation required",
          description: "Confirm witness acknowledgement to complete this pact.",
          variant: "destructive",
        });
        return;
      }

      proofSubmission = {
        method,
        confidence,
        witnessConfirmed: true,
        text: proofText.trim() || "Witness confirmation submitted.",
        submittedAt: new Date().toISOString(),
      };
    }

    setLoadingComplete(true);
    try {
      await completeCommitment(commitmentId, proofSubmission);
      setLocation(`/result?commitment_id=${commitmentId}`);
    } finally {
      setLoadingComplete(false);
    }
  }

  async function markFailed(commitmentId: string) {
    await markMissed(commitmentId);
  }

  useEffect(() => {
    setProofText("");
    setCheckinConfirmed(false);
    setWitnessConfirmed(false);
    setPhotoDataUrl(null);
  }, [selectedId]);

  return (
    <div className="relative">
      <div className="noise-bg" />

      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-4">
            <div>
            <h1 className="text-4xl font-heading font-bold text-glow">
              WEEKLY REALITY
            </h1>
            <p className="text-muted-foreground text-lg">
              You kept <span className="text-white font-semibold">{weeklyReality.kept}/{weeklyReality.total || 0}</span> commitments this week.
            </p>
            </div>

            <div className="flex items-end gap-4">
              <div className="text-right">
                <div className="text-3xl font-bold">{integrityScore}</div>
                <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${integrityIdentity.colorClass}`}>
                  {integrityIdentity.label}
                </div>
              </div>

              <Button
                className="rounded-none h-12 px-6 text-lg font-bold"
                onClick={() => setLocation("/capture")}
              >
                + NEW PACT
              </Button>
            </div>
          </div>

          <div className="text-sm text-zinc-400">
            {weeklyReality.baselineLine} {identityPressureLine}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="glass-panel p-6 brutal-shadow space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60">Weekly Reality Block</div>
                <div className="text-3xl font-bold mt-2">You kept {weeklyReality.kept}/{weeklyReality.total || 0} commitments.</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-300">{stats.dueSoonCount}</div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">At risk now</div>
              </div>
            </div>

            <div className="border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-widest opacity-60">Pattern Callout</div>
              <div className="text-xl font-bold mt-2">{weeklyReality.patternCallout}</div>
              <div className="text-sm text-zinc-400 mt-2">{weeklyReality.baselineLine}</div>
            </div>
          </div>

          <div className="glass-panel p-6 brutal-shadow space-y-4">
            <div className="text-xs uppercase tracking-widest opacity-60">Simple Signals</div>

            <div className="border border-zinc-800 bg-black/30 p-4">
              <div className="text-[11px] uppercase tracking-widest text-zinc-500">Most missed category</div>
              <div className="text-lg font-bold mt-2">{formatCategoryLabel(weeklyReality.mostMissedCategory)}</div>
            </div>

            <div className="border border-zinc-800 bg-black/30 p-4">
              <div className="text-[11px] uppercase tracking-widest text-zinc-500">Best time</div>
              <div className="text-lg font-bold mt-2">{formatTimeLabel(weeklyReality.bestTime)}</div>
            </div>

            <div className="border border-zinc-800 bg-black/30 p-4">
              <div className="text-[11px] uppercase tracking-widest text-zinc-500">Weakest pattern</div>
              <div className="text-lg font-bold mt-2">{weeklyReality.weakestPattern}</div>
            </div>
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

                  <div className="text-sm opacity-80 mt-2">
                    Pact: <span className="text-white">{c.pact ?? "Pact"}</span>
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
                        if (c.proof_method !== "checkin") {
                          setSelectedId(c.id);
                          toast({
                            title: "Proof required",
                            description: `Use the focus panel to submit ${getProofMethodLabel(c.proof_method).toLowerCase()} proof before completion.`,
                          });
                          return;
                        }

                        setCheckinConfirmed(true);
                        await completeWithProof(c.id);
                      }}
                    >
                      {loadingComplete ? "…" : "COMPLETE"}
                    </Button>
                  </div>
                </button>
              );
            })}

            {!sortedCards.length && (
              <div className="glass-panel p-8 space-y-4">
                <div className="text-zinc-300 font-semibold">No active pacts. Nothing is at stake.</div>
                <div className="text-zinc-500 text-sm">Every day without a pact is a day without pressure.</div>
                <Button className="rounded-none font-bold bg-red-600 hover:bg-red-700 text-white" onClick={() => setLocation("/capture")}>
                  CREATE YOUR FIRST PACT
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <IdentityRecoveryCard plan={recoveryPlan} />

            <IntegrityIdentityCard
              score={integrityScore}
              identity={integrityIdentity}
            />

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

                <div className="border border-zinc-800 p-4 bg-black/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs uppercase tracking-widest opacity-60">
                      Proof method
                    </div>
                    {adaptiveProofPolicy.required && (
                      <span className="text-[10px] uppercase tracking-widest border border-amber-600/50 text-amber-400 px-2 py-0.5">
                        Tier minimum: {getProofMethodLabel(adaptiveProofPolicy.minimumMethod)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    {getProofMethodLabel(selected.proof_method)}
                  </div>
                  <div className="text-xs opacity-70">
                    Confidence: {getProofConfidenceLabel(getProofConfidence(selected.proof_method))}
                  </div>
                  {adaptiveProofPolicy.nudgeMessage && (
                    <div className="text-xs border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-zinc-300">
                      {adaptiveProofPolicy.nudgeMessage}
                    </div>
                  )}

                  {selected.status === "active" && selected.proof_method === "checkin" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checkinConfirmed}
                        onChange={(e) => setCheckinConfirmed(e.target.checked)}
                      />
                      I did it
                    </label>
                  )}

                  {selected.status === "active" && selected.proof_method === "text" && (
                    <textarea
                      value={proofText}
                      onChange={(e) => setProofText(e.target.value)}
                      rows={3}
                      placeholder="What did you complete?"
                      className="w-full bg-black/40 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-white"
                    />
                  )}

                  {selected.status === "active" && selected.proof_method === "photo" && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProofFileChange(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm"
                      />
                      {photoDataUrl && (
                        <img src={photoDataUrl} alt="Proof preview" className="max-h-40 border border-zinc-700" />
                      )}
                    </div>
                  )}

                  {selected.status === "active" && selected.proof_method === "witness" && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={witnessConfirmed}
                          onChange={(e) => setWitnessConfirmed(e.target.checked)}
                        />
                        Witness confirmed
                      </label>
                      <input
                        value={proofText}
                        onChange={(e) => setProofText(e.target.value)}
                        placeholder="Optional witness note"
                        className="w-full bg-black/40 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-white"
                      />
                    </div>
                  )}
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

                <div className="border border-zinc-800 p-4 bg-black/30 space-y-2">
                  <div className="text-xs uppercase tracking-widest opacity-60">
                    Pattern warning
                  </div>
                  <div className="text-sm">
                    {psychProfile?.pattern_warning ?? behaviorProfile.psych.pattern_warning}
                  </div>
                </div>

                <div className="border border-zinc-800 p-4 bg-black/30 space-y-2">
                  <div className="text-xs uppercase tracking-widest opacity-60">
                    Best leverage point
                  </div>
                  <div className="text-sm">
                    {psychProfile?.best_leverage_point ?? behaviorProfile.psych.best_leverage_point}
                  </div>
                </div>

                <div className="border border-zinc-800 p-4 bg-black/30 space-y-2">
                  <div className="text-xs uppercase tracking-widest opacity-60">
                    Identity risk
                  </div>
                  <div className="text-sm">
                    {psychProfile?.identity_risk ?? behaviorProfile.psych.identity_risk}
                  </div>
                </div>

                  <div className="border border-zinc-800 p-4 bg-black/30 space-y-2">
                    <div className="text-xs uppercase tracking-widest opacity-60">
                      Next pressure line
                    </div>
                    <div className="text-sm">
                      {psychProfile?.next_pressure_line ?? behaviorProfile.psych.next_pressure_line}
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
                      className="rounded-none h-12"
                      disabled={loadingComplete || selected.status === "completed"}
                      onClick={async () => {
                        await completeWithProof(selected.id);
                      }}
                    >
                      {loadingComplete ? "…" : "COMPLETE"}
                    </Button>

                    <Button
                      variant="destructive"
                      className="rounded-none h-12 col-span-2"
                      disabled={loadingFail || selected.status === "failed"}
                      onClick={async () => {
                        setLoadingFail(true);
                        try {
                          await markFailed(selected.id);
                          setLocation(`/result?commitment_id=${selected.id}`);
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
    </div>
  );
}
