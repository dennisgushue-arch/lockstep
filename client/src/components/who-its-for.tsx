import React from "react";

const FOR = [
  "People tired of breaking their word",
  "People who want hard accountability",
  "People who accept stakes when they flinch",
  "People who care about proof over hype",
];

const NOT_FOR = [
  "People who want gentle reminders",
  "People who want goals with no downside",
  "People who want motivation without stakes",
  "People not ready to face the pattern",
];

export default function WhoItsFor() {
  return (
    <section className="py-16 sm:py-24 px-5 sm:px-6 border-b border-border bg-black">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">Fit</div>

          <h2 className="text-3xl md:text-5xl font-heading font-bold leading-tight">This isn&apos;t for everyone.</h2>

          <p className="text-sm md:text-base text-zinc-300">For pressure, proof, and stakes.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 space-y-5">
            <div className="text-xs uppercase tracking-widest text-zinc-500">This is for</div>

            <div className="text-xl md:text-2xl font-bold">People who want their word on the line.</div>

            <div className="space-y-3 text-sm md:text-base">
              {FOR.map((item) => (
                <div key={item} className="text-zinc-300">
                  • {item}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-red-900/40 bg-red-950/10 p-5 sm:p-6 space-y-5">
            <div className="text-xs uppercase tracking-widest text-red-400">This is not for</div>

            <div className="text-xl md:text-2xl font-bold">People who want comfort without stakes.</div>

            <div className="space-y-3 text-sm md:text-base text-zinc-200">
              {NOT_FOR.map((item) => (
                <div key={item}>• {item}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center pt-2">
          <div className="text-xl md:text-2xl font-bold">If you want honesty, stay.</div>
          <div className="text-zinc-400 mt-2">If you want softness, leave.</div>
        </div>
      </div>
    </section>
  );
}
