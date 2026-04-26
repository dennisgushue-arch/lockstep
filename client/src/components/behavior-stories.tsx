import React from "react";

const STORIES = [
  {
    quote: "I said I'd work out for months. Did it in 2 days because I didn't want to lose.",
    before: "Said 7 times",
    after: "Completed 3 in a row",
  },
  {
    quote: "I kept saying I'd send the proposal. Locked it in, sent it that night.",
    before: "Draft sat for 11 days",
    after: "Sent within 6 hours",
  },
  {
    quote: "I always told myself I'd fix my spending. First pact forced one real money move.",
    before: "Tracked 0 weeks",
    after: "Logged 4 money actions",
  },
];

export default function BehaviorStories() {
  return (
    <section className="py-16 sm:py-24 px-5 sm:px-6 border-b border-border bg-black">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">Behavior Shift</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">Stories that show behavior changed</h2>
          <p className="text-sm md:text-base text-zinc-400">
            Not motivation. Not vibes. Before the pact, they stalled. After the pact, they moved.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {STORIES.map((story) => (
            <div key={story.quote} className="border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 space-y-5">
              <div className="text-lg font-semibold leading-relaxed text-zinc-100">“{story.quote}”</div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border border-zinc-800 bg-black/40 p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Before</div>
                  <div className="text-zinc-300">{story.before}</div>
                </div>
                <div className="border border-red-900/40 bg-red-950/10 p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest text-red-400">After</div>
                  <div className="text-white font-semibold">{story.after}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}