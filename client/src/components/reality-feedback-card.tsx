import React from "react";
import type { RealityFeedback } from "@/lib/reality-feedback";

export default function RealityFeedbackCard({
  feedback,
}: {
  feedback: RealityFeedback;
}) {
  const tone =
    feedback.severity === "critical"
      ? "border-red-900/40 bg-red-950/10"
      : feedback.severity === "warning"
        ? "border-yellow-900/40 bg-yellow-950/10"
        : "border-green-900/40 bg-green-950/10";

  const label =
    feedback.severity === "critical"
      ? "Reality Check"
      : feedback.severity === "warning"
        ? "Pattern Warning"
        : "Momentum";

  return (
    <div className={`border p-5 space-y-4 ${tone}`}>
      <div className="text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </div>

      <div className="text-2xl font-bold">{feedback.headline}</div>

      <div className="space-y-3 text-sm text-zinc-300">
        <div>
          <span className="text-zinc-500">Truth: </span>
          {feedback.truth}
        </div>

        <div>
          <span className="text-zinc-500">Pattern: </span>
          {feedback.pattern}
        </div>

        <div>
          <span className="text-zinc-500">Next: </span>
          {feedback.nextMove}
        </div>
      </div>
    </div>
  );
}
