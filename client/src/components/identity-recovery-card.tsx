import React from "react";

export default function IdentityRecoveryCard({
  plan,
}: {
  plan: {
    mode: string;
    headline: string;
    instruction: string;
    nextAction: string;
    deadlineHint: string;
    reason: string;
  };
}) {
  if (plan.mode === "none") return null;

  // Share handler: copy to clipboard and open share dialog if available
  const handleSupport = () => {
    const text = `I'm working on my recovery quest in Lockstep: ${plan.instruction} — ${plan.nextAction}`;
    if (navigator.share) {
      navigator.share({
        title: "Lockstep Recovery Quest",
        text,
        url: window.location.origin + "/dashboard",
      });
    } else {
      navigator.clipboard.writeText(text + " " + window.location.origin + "/dashboard");
      alert("Recovery quest copied! Send it to your accountability partner.");
    }
  };

  return (
    <div className="border border-red-900/40 bg-red-950/10 p-5 space-y-4 rounded-xl shadow-md text-center md:text-left md:p-5 md:space-y-4 sm:p-3 sm:space-y-3">
      <div className="text-xs uppercase tracking-widest text-red-400">
        {plan.headline}
      </div>
      <div className="text-lg font-bold md:text-lg sm:text-base">
        {plan.instruction}
      </div>
      <div className="text-sm text-zinc-300">
        {plan.nextAction}
      </div>
      <div className="text-xs text-zinc-500">
        {plan.deadlineHint}
      </div>
      <div className="text-xs text-zinc-500 border-t border-zinc-800 pt-3 md:pt-3 sm:pt-2">
        {plan.reason}
      </div>
      <button
        className="mt-2 px-3 py-1 rounded bg-blue-700 text-white text-xs hover:bg-blue-800 transition"
        onClick={handleSupport}
        type="button"
      >
        Request Support
      </button>
    </div>
  );
}
