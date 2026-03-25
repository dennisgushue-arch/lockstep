import React from "react";

export default function BeforeAfter() {
  return (
    <section className="py-20 px-5 border-b border-border bg-zinc-950/40">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Transformation
          </div>

          <h2 className="text-3xl md:text-5xl font-heading font-bold leading-tight">Before / After Lockstep</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* BEFORE */}
          <div className="border border-zinc-800 p-5 md:p-6 bg-black/30 space-y-4">
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Before
            </div>

            <div className="text-xl md:text-2xl font-bold text-zinc-200">
              You rely on flinching
            </div>

            <ul className="space-y-3 text-sm md:text-base text-zinc-400">
              <li>• “I’ll start tomorrow”</li>
              <li>• You stall and call it planning</li>
              <li>• Missing has no penalty</li>
              <li>• The flinch stays hidden</li>
            </ul>
          </div>

          {/* AFTER */}
          <div className="border border-red-900/40 p-5 md:p-6 bg-red-950/10 space-y-4">
            <div className="text-xs uppercase tracking-widest text-red-400">
              After
            </div>

            <div className="text-xl md:text-2xl font-bold">
              You operate on proof and penalty
            </div>

            <ul className="space-y-3 text-sm md:text-base text-zinc-200">
              <li>• Clear action. Hard deadline.</li>
              <li>• Every pact carries a penalty</li>
              <li>• You either prove it or pay</li>
              <li>• The flinch gets exposed fast</li>
            </ul>
          </div>
        </div>

        <div className="text-center pt-4">
          <div className="text-xl md:text-2xl font-bold">Not motivation. Penalty.</div>
        </div>
      </div>
    </section>
  );
}
