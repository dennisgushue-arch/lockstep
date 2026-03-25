import React from "react";

const EXAMPLES = [
  'You said "start working out" three times this week.',
  'You blocked side-project time five times last month and flinched every time.',
  'You say "I should call my parents" every Sunday night and still don&apos;t.',
  'You keep renaming the same task so you don&apos;t have to start it.',
];

export default function WhatLockstepNotices() {
  return (
    <section className="py-20 px-5 border-b border-border bg-black">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="space-y-4 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Early Detection
          </div>

          <h2 className="text-3xl md:text-5xl font-heading font-bold leading-tight">What Lockstep sees before you admit it</h2>

          <p className="text-sm md:text-base text-zinc-300 max-w-3xl mx-auto">
            Your flinch shows up before your promise does.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
          {EXAMPLES.map((item, i) => (
            <div
              key={i}
              className="border border-zinc-800 p-5 md:p-6 bg-zinc-950/40 text-sm md:text-base"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="text-center pt-6">
          <div className="text-xl md:text-2xl font-bold">
            Lockstep turns the flinch into a penalty.
          </div>
        </div>
      </div>
    </section>
  );
}
