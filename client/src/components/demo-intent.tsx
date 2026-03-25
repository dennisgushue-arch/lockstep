import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { analyzeIntent } from "@/lib/ai";
import type { AnalyzeIntentResult } from "@/types/intent";

type DemoIntentProps = {
  onLockReal: () => void;
};

function formatProofMethod(proof: AnalyzeIntentResult["parsed_intent"]["proof_method"]) {
  switch (proof) {
    case "check_in":
      return "Check-in";
    case "photo":
      return "Photo";
    case "location":
      return "Location";
    case "calendar":
      return "Calendar";
    case "manual":
      return "Manual";
    default:
      return "Check-in";
  }
}

function fallbackDemoResult(text: string): AnalyzeIntentResult {
  const lower = text.toLowerCase();
  const running = lower.includes("run") || lower.includes("running") || lower.includes("jog");

  return {
    parsed_intent: {
      raw_text: text,
      action: running ? "Run 3 miles" : "Complete one concrete action",
      category: running ? "health" : "personal",
      metric: {
        type: running ? "distance" : null,
        target: running ? 3 : null,
        unit: running ? "miles" : null,
      },
      deadline_at: null,
      proof_method: "check_in",
      difficulty: 3,
      confidence: 0.76,
    },
    risk: {
      score: 0.7,
      level: "high",
      reasons: ["Morning schedule overloaded"],
      at_risk_warning: "Morning schedule overloaded.",
    },
    recommendation: {
      rewrite: running ? "Run 3 miles" : "Define one specific, measurable action",
      suggested_stake: 10,
      suggested_first_step: "Prepare tonight so execution is frictionless tomorrow morning.",
      should_ask_followup: false,
      followup_question: null,
    },
    reflection_message: "You follow through more often when the action is specific and scheduled.",
  };
}

export default function DemoIntent({ onLockReal }: DemoIntentProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalyzeIntentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder = useMemo(
    () => "I should start running again",
    [],
  );

  async function runDemo() {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeIntent(text.trim());
      setResult(data);
    } catch {
      setResult(fallbackDemoResult(text.trim()));
      setError("Live analysis unavailable right now — showing a realistic demo output.");
    } finally {
      setLoading(false);
    }
  }

  const action = result?.recommendation.rewrite || result?.parsed_intent.action || "Run 3 miles";
  const deadline = result?.parsed_intent.deadline_at
    ? new Date(result.parsed_intent.deadline_at).toLocaleString()
    : "Tomorrow 7:00 AM";
  const stake = result?.recommendation.suggested_stake ?? 10;
  const proof = result ? formatProofMethod(result.parsed_intent.proof_method) : "Check-in";
  const risk =
    result?.risk.at_risk_warning ||
    result?.risk.reasons?.[0] ||
    "Morning schedule overloaded";

  return (
    <section id="demo" className="container max-w-6xl mx-auto px-5 py-16 border-b border-zinc-800">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
        <div className="space-y-5">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">Interactive Demo</div>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Type one sentence.
            <br />
            See a pact appear.
          </h2>
          <p className="text-zinc-300 text-base md:text-lg">
            See the stake, the proof bar, and the penalty in seconds.
          </p>

          <div className="space-y-3">
            <div className="text-sm text-zinc-500">Type the flinch you keep repeating.</div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={placeholder}
              className="w-full min-h-[96px] bg-transparent text-white text-base outline-none resize-none placeholder:text-zinc-600 border border-zinc-700 p-4"
            />

            <div className="flex flex-wrap gap-3">
              <Button
                className="w-full sm:w-auto rounded-none h-14 px-8 bg-red-600 text-white hover:bg-red-700"
                onClick={runDemo}
                disabled={loading || !text.trim()}
              >
                {loading ? "ANALYZING..." : "RUN DEMO"}
              </Button>

              <Button
                variant="secondary"
                className="w-full sm:w-auto rounded-none h-14 px-8 border border-zinc-700 bg-transparent hover:bg-zinc-900"
                onClick={() => setText("I should start running again")}
              >
                USE A COMMON FLINCH
              </Button>
            </div>

            {error ? <p className="text-sm text-orange-300">{error}</p> : null}
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-5 md:p-6 space-y-5 brutal-shadow">
          <div className="text-xs uppercase tracking-widest text-red-400">Demo Output</div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-zinc-800 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Action</div>
              <div className="text-sm md:text-base font-bold mt-1 truncate">{action}</div>
            </div>

            <div className="border border-zinc-800 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Deadline</div>
              <div className="text-sm md:text-base font-bold mt-1 truncate">{deadline}</div>
            </div>

            <div className="border border-zinc-800 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Stake</div>
              <div className="text-sm md:text-base font-bold mt-1">${stake}</div>
            </div>

            <div className="border border-zinc-800 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Proof</div>
              <div className="text-sm md:text-base font-bold mt-1">{proof}</div>
            </div>
          </div>

          <div className="border border-orange-700/40 bg-orange-950/20 p-4">
            <div className="text-xs uppercase tracking-widest text-orange-400">Main Risk</div>
            <div className="mt-2 text-sm text-orange-100">{risk}</div>
          </div>

          {result ? (
            <Button
              className="w-full sm:w-auto rounded-none h-14 px-8 bg-white text-black hover:bg-zinc-200"
              onClick={onLockReal}
            >
              ATTACH A PENALTY
            </Button>
          ) : (
            <div className="text-sm text-zinc-500">
              Run the demo to see the penalty.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}