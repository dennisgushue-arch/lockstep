import React from "react";

const EXAMPLES = [
  'You said "start working out" three times this week.',
  'You blocked side projects five times. Still flinched.',
  'You say "call them" every Sunday. Never do.',
  'You keep renaming the task so you never start.',
];

export default function WhatLockstepNotices() {
  return (
    <section className="py-16 sm:py-24 px-5 sm:px-6 border-b border-border bg-black">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="space-y-4 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Early Detection
          </div>

          <h2 className="text-3xl md:text-5xl font-heading font-bold leading-tight">What Lockstep sees first</h2>

          <p className="text-sm md:text-base text-zinc-300 max-w-3xl mx-auto">The flinch shows up first.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
          {EXAMPLES.map((item, i) => (
            <div
              key={i}
              className="border border-zinc-800 p-5 sm:p-6 bg-zinc-950/40 text-sm md:text-base"
            >
              {item}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-500">
          Example lines are illustrative composites.
        </p>

        <div className="text-center pt-6">
          <div className="text-xl md:text-2xl font-bold">
            Lockstep turns flinching into stakes.
          </div>
        </div>
      </div>
    </section>
  );
}
