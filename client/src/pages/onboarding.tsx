import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/mock-data";
import { analytics } from "@/lib/analytics";

const QUICK_STARTS = [
  "2-min walk",
  "Send 1 message",
  "Drink water now",
  "Write one sentence",
];

const FIRST_PACT_DEADLINE_OPTIONS = [30, 60, 90, 120] as const;

const ONBOARDING_STORAGE_KEY = "onboarding_completed_v1";
const LIVE_BANNER_STORAGE_KEY = "lockstep_onboarding_live_banner_v1";
const LOCKSTEP_RED = "#FF3B30";
const LOCKSTEP_WHITE = "#ffffff";
const LOCKSTEP_BLACK = "#050505";
const AI_TUNING_STORAGE_KEY = "lockstep_ai_tuning_v1";

type AiTuningProfile = {
  stakeBias: number;
  preferredDeadlineMinutes: (typeof FIRST_PACT_DEADLINE_OPTIONS)[number] | null;
  preferredProofMethod: "checkin" | "text" | "photo" | "witness" | null;
  counts: {
    too_hard: number;
    too_easy: number;
    wrong_deadline: number;
    wrong_proof: number;
  };
};

const DEFAULT_TUNING: AiTuningProfile = {
  stakeBias: 0,
  preferredDeadlineMinutes: null,
  preferredProofMethod: null,
  counts: {
    too_hard: 0,
    too_easy: 0,
    wrong_deadline: 0,
    wrong_proof: 0,
  },
};

function resolveProofMethod(method?: string | null): "checkin" | "photo" | "text" | "witness" {
  if (method === "photo" || method === "text" || method === "witness") return method;
  return "checkin";
}

export default function Onboarding() {
  const [location, setLocation] = useLocation();
  const { analyzeIntent, currentIntent, createCommitment, commitments, user } = useApp();
  const isFirstPact = commitments.length === 0;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [createdAction, setCreatedAction] = useState<string>("");
  const [createdStake, setCreatedStake] = useState<number>(5);
  const [selectedDeadlineMinutes, setSelectedDeadlineMinutes] = useState<(typeof FIRST_PACT_DEADLINE_OPTIONS)[number]>(60);
  const [selectedProofMethod, setSelectedProofMethod] = useState<"checkin" | "text" | "photo" | "witness">("checkin");
  const [trustFeedback, setTrustFeedback] = useState<string | null>(null);
  const [stakeAdjustment, setStakeAdjustment] = useState(0);
  const [step3EnteredAt, setStep3EnteredAt] = useState<number | null>(null);
  const [tuningProfile, setTuningProfile] = useState<AiTuningProfile>(() => {
    if (typeof window === "undefined") return DEFAULT_TUNING;
    try {
      const raw = window.localStorage.getItem(AI_TUNING_STORAGE_KEY);
      if (!raw) return DEFAULT_TUNING;
      const parsed = JSON.parse(raw) as Partial<AiTuningProfile>;
      return {
        stakeBias: Number.isFinite(parsed.stakeBias) ? Number(parsed.stakeBias) : 0,
        preferredDeadlineMinutes:
          parsed.preferredDeadlineMinutes && FIRST_PACT_DEADLINE_OPTIONS.includes(parsed.preferredDeadlineMinutes)
            ? parsed.preferredDeadlineMinutes
            : null,
        preferredProofMethod:
          parsed.preferredProofMethod === "checkin" ||
          parsed.preferredProofMethod === "text" ||
          parsed.preferredProofMethod === "photo" ||
          parsed.preferredProofMethod === "witness"
            ? parsed.preferredProofMethod
            : null,
        counts: {
          too_hard: parsed.counts?.too_hard ?? 0,
          too_easy: parsed.counts?.too_easy ?? 0,
          wrong_deadline: parsed.counts?.wrong_deadline ?? 0,
          wrong_proof: parsed.counts?.wrong_proof ?? 0,
        },
      };
    } catch {
      return DEFAULT_TUNING;
    }
  });

  const persistTuningProfile = (next: AiTuningProfile) => {
    setTuningProfile(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AI_TUNING_STORAGE_KEY, JSON.stringify(next));
    }
  };

  const applyTrustFeedback = (
    feedback: "too_hard" | "too_easy" | "wrong_deadline" | "wrong_proof",
    value?: (typeof FIRST_PACT_DEADLINE_OPTIONS)[number] | "checkin" | "text" | "photo" | "witness",
  ) => {
    const next: AiTuningProfile = {
      ...tuningProfile,
      counts: {
        ...tuningProfile.counts,
        [feedback]: tuningProfile.counts[feedback] + 1,
      },
    };

    if (feedback === "too_hard") {
      next.stakeBias = Math.max(-2, tuningProfile.stakeBias - 1);
    }

    if (feedback === "too_easy") {
      next.stakeBias = Math.min(2, tuningProfile.stakeBias + 1);
    }

    if (feedback === "wrong_deadline") {
      next.preferredDeadlineMinutes =
        typeof value === "number" && FIRST_PACT_DEADLINE_OPTIONS.includes(value)
          ? value
          : selectedDeadlineMinutes;
    }

    if (feedback === "wrong_proof") {
      next.preferredProofMethod =
        value === "checkin" || value === "text" || value === "photo" || value === "witness"
          ? value
          : selectedProofMethod;
    }

    persistTuningProfile(next);
  };

  useEffect(() => {
    if (!user) {
      if (location !== "/auth") {
        setLocation("/auth");
      }
      return;
    }

    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    const hasCommitments = commitments.length > 0;

    // Keep routing guards in sync: if user already has a pact, onboarding is implicitly complete.
    if (hasCommitments && !completed) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    }

    if ((completed || hasCommitments) && location !== "/momentum") {
      setLocation("/momentum");
    }
  }, [commitments.length, location, setLocation, user]);

  const [secondsLeft, setSecondsLeft] = useState(selectedDeadlineMinutes * 60);

  useEffect(() => {
    if (!createdAt || step !== 4) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((createdAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [createdAt, step]);

  useEffect(() => {
    if (!currentIntent) return;

    const aiProofMethod = resolveProofMethod(currentIntent.parsed_intent?.proof_method || currentIntent.proof_method);
    setSelectedProofMethod(tuningProfile.preferredProofMethod || aiProofMethod);
    const difficulty = currentIntent.parsed_intent?.difficulty ?? 3;
    const minutesByDifficulty: Record<1 | 2 | 3 | 4 | 5, (typeof FIRST_PACT_DEADLINE_OPTIONS)[number]> = {
      1: 30,
      2: 60,
      3: 60,
      4: 90,
      5: 120,
    };
    setSelectedDeadlineMinutes(tuningProfile.preferredDeadlineMinutes || minutesByDifficulty[difficulty]);
    setStakeAdjustment(tuningProfile.stakeBias);
    setTrustFeedback(null);
  }, [currentIntent, tuningProfile.preferredDeadlineMinutes, tuningProfile.preferredProofMethod, tuningProfile.stakeBias]);

  const formattedTime = useMemo(() => {
    const h = Math.floor(secondsLeft / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((secondsLeft % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(secondsLeft % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [secondsLeft]);

  const adaptationNotes = useMemo(() => {
    const notes: string[] = [];
    const totalAdjustments = Object.values(tuningProfile.counts).reduce((sum, value) => sum + value, 0);

    if (totalAdjustments > 0) {
      notes.push("Adjusted based on your earlier feedback.");
    }

    if ((tuningProfile.preferredDeadlineMinutes ?? selectedDeadlineMinutes) <= 60) {
      notes.push("Using shorter deadlines because you preferred fast wins.");
    }

    if (tuningProfile.preferredProofMethod === "text") {
      notes.push("Using more flexible proof because you preferred a talk-it-out check-in.");
    } else if (tuningProfile.preferredProofMethod) {
      notes.push(`Using ${tuningProfile.preferredProofMethod} proof because that matched your earlier feedback.`);
    }

    return notes;
  }, [selectedDeadlineMinutes, tuningProfile.counts, tuningProfile.preferredDeadlineMinutes, tuningProfile.preferredProofMethod]);

  async function handleNext() {
    if (!text.trim()) return;

    setLoading(true);
    try {
      analytics.track("first_intent_submitted", {
        source: "onboarding",
        preset_match: QUICK_STARTS.includes(text) ? text : null,
      });
      await analyzeIntent(text);
      setStep3EnteredAt(Date.now());
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  async function handleLockIn() {
    if (!currentIntent) return;

    setLocking(true);
    try {
      const deadlineMinutes = isFirstPact
        ? Math.max(30, Math.min(120, selectedDeadlineMinutes))
        : 120;
      const deadline = new Date(Date.now() + deadlineMinutes * 60 * 1000);

      const baseStake = currentIntent.suggested_stake || 5;
      const adjustedStake = Math.max(1, baseStake + stakeAdjustment);
      const creditsCost = isFirstPact
        ? Math.min(5, Math.max(3, adjustedStake))
        : adjustedStake;
      const actionText = currentIntent.action || currentIntent.goal || currentIntent.text;
      const aiProofMethod = resolveProofMethod(currentIntent.parsed_intent?.proof_method || currentIntent.proof_method);
      const aiDifficulty = currentIntent.parsed_intent?.difficulty ?? 3;
      const aiDeadlineDefaults: Record<1 | 2 | 3 | 4 | 5, (typeof FIRST_PACT_DEADLINE_OPTIONS)[number]> = {
        1: 30,
        2: 60,
        3: 60,
        4: 90,
        5: 120,
      };
      const aiSuggestedDeadline = aiDeadlineDefaults[aiDifficulty];
      const aiSuggestedStake = Math.min(5, Math.max(3, baseStake));
      const acceptedWithoutEdit =
        selectedProofMethod === aiProofMethod &&
        selectedDeadlineMinutes === aiSuggestedDeadline &&
        Math.min(5, Math.max(3, adjustedStake)) === aiSuggestedStake;

      const timeToLockSeconds = step3EnteredAt
        ? Math.max(0, Math.round((Date.now() - step3EnteredAt) / 1000))
        : null;

      await createCommitment({
        creditsCost,
        consequenceType: "money",
        scheduledDate: deadline,
        refundOnCompletion: true,
        actionText,
        stakeAmount: creditsCost,
        proofMethod: selectedProofMethod || resolveProofMethod(currentIntent.parsed_intent?.proof_method || currentIntent.proof_method),
        aiPlan: {
          parsed_intent: currentIntent.parsed_intent,
        },
      });

      analytics.track("first_pact_created", {
        source: "onboarding",
        deadline_minutes: deadlineMinutes,
        stake: creditsCost,
        proof_method: selectedProofMethod,
        ai_accept_without_edit: acceptedWithoutEdit,
        time_to_lock_seconds: timeToLockSeconds,
      });

      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      localStorage.setItem(LIVE_BANNER_STORAGE_KEY, "true");

      setCreatedAt(deadline.getTime());
      setSecondsLeft(deadlineMinutes * 60);
      setCreatedAction(actionText || "Run for 5 minutes");
      setCreatedStake(creditsCost);
      setStep(4);
    } finally {
      setLocking(false);
    }
  }

  return (
    <div
      className="ls-screen flex items-center justify-center px-5 py-8 premium-screen"
      style={{ color: LOCKSTEP_WHITE }}
    >
      <div className="w-full max-w-[430px]">
        {step === 1 && (
          <div className="space-y-10 text-center">
            <div className="mx-auto max-w-[14ch]">
              <h1
                className="premium-headline text-[3.9rem] sm:text-[5rem] leading-[0.82]"
                style={{ color: LOCKSTEP_WHITE }}
              >
                YOU SAID
                <br />
                YOU WOULD
              </h1>
            </div>

            <p className="text-[1.45rem] font-bold premium-subtext tracking-[-0.01em]">BUT YOU DIDN&apos;T</p>

            <Button
              onClick={() => setStep(2)}
              className="w-full h-14 rounded-2xl font-black text-lg tracking-[0.18em] uppercase premium-cta ls-button-primary"
            >
              FIX IT NOW
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-2 text-center">
              <h1 className="premium-headline text-[2.35rem] leading-[1.02] tracking-[-0.02em]">NAME THE PROMISE.</h1>
            </div>

            <div className="relative premium-input-glass p-3 premium-glow-purple">
              <span className="premium-particle left-4 top-5" />
              <span className="premium-particle right-10 top-6" style={{ animationDelay: "0.8s" }} />
              <span className="premium-particle right-6 bottom-5" style={{ animationDelay: "1.4s" }} />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="I said I would..."
                className="w-full min-h-[132px] bg-transparent p-4 text-lg outline-none resize-none focus:border-white"
                style={{ color: LOCKSTEP_WHITE }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {QUICK_STARTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setText(item);
                    analytics.track("first_pact_preset_selected", { preset: item });
                  }}
                  className={`premium-pill p-3 text-sm text-left ${text === item ? "premium-pill-active" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>

            <Button
              disabled={!text.trim() || loading}
              onClick={handleNext}
              className="w-full h-14 rounded-2xl font-black tracking-wide premium-cta premium-breathe ls-button-primary"
            >
              {loading ? "TUNING..." : "TUNE IT"}
            </Button>
          </div>
        )}

        {step === 3 && currentIntent && (
          <div className="space-y-6 text-center">
            <div className="text-[11px] uppercase tracking-[0.35em] text-danger font-bold">THIS IS NOW REAL</div>

            <h1 className="text-[2.05rem] font-black tracking-[-0.02em]">LOCK IT IN</h1>

            <div className="surface-gradient ls-card p-5 text-left space-y-4 glow-purple-soft">
              <div>
                <div className="text-xs uppercase tracking-widest label-subtle">Action</div>
                <div className="text-2xl font-black mt-1 leading-tight">{currentIntent.action || currentIntent.goal || currentIntent.text}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest label-subtle">Deadline</div>
                <div className="text-muted mt-1 glow-purple-soft inline-block px-2 py-1">Within {selectedDeadlineMinutes} minutes</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest label-subtle">Stake</div>
                <div className="text-[#ff2b2b] font-black mt-1">{Math.min(5, Math.max(3, (currentIntent.suggested_stake || 5) + stakeAdjustment))} credits at risk</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest label-subtle">Proof</div>
                <div className="text-muted mt-1">{selectedProofMethod}</div>
              </div>
            </div>

            <div className="surface-card p-4 text-left space-y-3">
              <div className="text-xs uppercase tracking-[0.2em] text-subtle">WHY THIS HITS</div>
              <div className="text-sm text-muted">
                {currentIntent.pact_size_reason || "Tiny first pact to build a quick win."}
              </div>
              <div className="text-sm text-muted">
                {currentIntent.deadline_reason || "Short deadline keeps momentum high."}
              </div>
              <div className="text-sm text-muted">
                {currentIntent.proof_reason || "Low-friction proof keeps this easy to complete."}
              </div>
              {adaptationNotes.length > 0 && (
                <div className="border border-violet-700/40 bg-violet-950/20 p-3 space-y-2 glow-purple-soft">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">What the AI learned</div>
                  {adaptationNotes.map((note) => (
                    <div key={note} className="text-sm text-zinc-300">{note}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 text-left">
              <div className="text-xs uppercase tracking-widest text-zinc-500">TUNE THE PRESSURE</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300 hover:border-[#ff2b2b]"
                  onClick={() => {
                    setStakeAdjustment(-1);
                    setTrustFeedback("too_hard");
                    applyTrustFeedback("too_hard");
                    analytics.track("ai_suggestion_adjusted", { reason: "too_hard" });
                  }}
                >
                  Too hard
                </button>
                <button
                  type="button"
                  className="border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300 hover:border-[#ff2b2b]"
                  onClick={() => {
                    setStakeAdjustment(1);
                    setTrustFeedback("too_easy");
                    applyTrustFeedback("too_easy");
                    analytics.track("ai_suggestion_adjusted", { reason: "too_easy" });
                  }}
                >
                  Too easy
                </button>
                <button
                  type="button"
                  className="border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300 hover:border-[#ff2b2b]"
                  onClick={() => {
                    const idx = FIRST_PACT_DEADLINE_OPTIONS.indexOf(selectedDeadlineMinutes);
                    const next = FIRST_PACT_DEADLINE_OPTIONS[(idx + 1) % FIRST_PACT_DEADLINE_OPTIONS.length];
                    setSelectedDeadlineMinutes(next);
                    setTrustFeedback("wrong_deadline");
                    applyTrustFeedback("wrong_deadline", next);
                    analytics.track("ai_suggestion_adjusted", { reason: "wrong_deadline", deadline_minutes: next });
                  }}
                >
                  Wrong deadline
                </button>
                <button
                  type="button"
                  className="border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300 hover:border-[#ff2b2b]"
                  onClick={() => {
                    const order: Array<"checkin" | "text" | "photo" | "witness"> = ["checkin", "text", "photo", "witness"];
                    const idx = order.indexOf(selectedProofMethod);
                    const next = order[(idx + 1) % order.length];
                    setSelectedProofMethod(next);
                    setTrustFeedback("wrong_proof");
                    applyTrustFeedback("wrong_proof", next);
                    analytics.track("ai_suggestion_adjusted", { reason: "wrong_proof", proof_method: next });
                  }}
                >
                  Wrong proof
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className="border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300 hover:border-[#ff2b2b]"
                  onClick={() => {
                    setStakeAdjustment(-1);
                    setTrustFeedback("made easier");
                    applyTrustFeedback("too_hard");
                    analytics.track("ai_suggestion_adjusted", { reason: "make_easier" });
                  }}
                >
                  Make it easier
                </button>
                <button
                  type="button"
                  className="border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300 hover:border-[#ff2b2b]"
                  onClick={() => {
                    const idx = FIRST_PACT_DEADLINE_OPTIONS.indexOf(selectedDeadlineMinutes);
                    const next = FIRST_PACT_DEADLINE_OPTIONS[Math.max(0, idx - 1)] ?? 30;
                    setSelectedDeadlineMinutes(next);
                    setTrustFeedback("made more urgent");
                    applyTrustFeedback("wrong_deadline", next);
                    analytics.track("ai_suggestion_adjusted", { reason: "make_more_urgent", deadline_minutes: next });
                  }}
                >
                  Make it more urgent
                </button>
                <button
                  type="button"
                  className="border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300 hover:border-[#ff2b2b]"
                  onClick={() => {
                    setSelectedProofMethod("text");
                    setTrustFeedback("using voice-style proof");
                    applyTrustFeedback("wrong_proof", "text");
                    analytics.track("ai_suggestion_adjusted", { reason: "use_voice_proof_instead", proof_method: "text" });
                  }}
                >
                  Use voice proof instead
                </button>
              </div>
              {trustFeedback && (
                <div className="text-xs text-zinc-400">Updated: {trustFeedback.replace("_", " ")}.</div>
              )}
            </div>

            <Button
              onClick={handleLockIn}
              disabled={locking}
              className="w-full h-14 rounded-none font-black tracking-wide ls-button-primary"
            >
              {locking ? "LOCKING..." : "LOCK IT IN"}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 text-center">
            <div className="text-[11px] uppercase tracking-[0.35em] text-[#ff2b2b] font-black">IT'S ON.</div>

            <div className="mx-auto max-w-[13ch]">
              <h1
                className="text-[2.35rem] sm:text-[2.6rem] font-black leading-[0.98] tracking-[-0.02em]"
                style={{ color: LOCKSTEP_WHITE }}
              >
                THE CLOCK IS RUNNING.
              </h1>
            </div>

            <div
              className="border p-5 text-left space-y-4 ls-card ls-glow-purple ls-float"
              style={{
                backgroundColor: LOCKSTEP_BLACK,
                borderColor: "rgba(255,255,255,0.3)",
                boxShadow: "0 0 24px rgba(124,58,237,0.2)",
              }}
            >
              <div className="text-2xl font-black leading-tight" style={{ color: LOCKSTEP_WHITE }}>{createdAction || "Run for 5 minutes"}</div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: LOCKSTEP_WHITE }}>TIME LEFT</div>
                <div className="text-[2.2rem] font-black mt-1 tracking-tight glow-purple-soft inline-block px-2 ls-pulse" style={{ color: LOCKSTEP_WHITE }}>{formattedTime}</div>
              </div>
              <div className="font-black uppercase tracking-[0.06em]">
                <span style={{ color: LOCKSTEP_WHITE }}>MISS THIS. </span>
                <span style={{ color: LOCKSTEP_RED }}>LOSE</span>
                <span style={{ color: LOCKSTEP_WHITE }}> {createdStake} CREDITS</span>
              </div>
            </div>

            <Button
              onClick={() => setLocation("/momentum")}
              className="w-full h-14 rounded-2xl font-black tracking-[0.16em] uppercase premium-cta premium-breathe ls-button-primary"
            >
              CLAIM IT
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
