import React, { useEffect, useState } from "react";

type Tone = "positive" | "negative" | "warning";

type OutcomeState = {
  label: string;
  value: string;
  delta: string;
  tone: Tone;
};

const STATES: OutcomeState[] = [
  {
    label: "Pacts Kept",
    value: "148",
    delta: "▲ +12 today",
    tone: "positive",
  },
  {
    label: "Failures Logged",
    value: "326",
    delta: "▲ +19 today",
    tone: "negative",
  },
  {
    label: "Integrity Shift",
    value: "+412",
    delta: "▲ +27 this week",
    tone: "positive",
  },
  {
    label: "Bluffs Exposed",
    value: "89",
    delta: "▲ +6 today",
    tone: "warning",
  },
];

function toneClass(tone: Tone) {
  if (tone === "positive") return "text-green-400";
  if (tone === "negative") return "text-red-400";
  return "text-yellow-400";
}

export default function LiveOutcomeStrip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATES.length);
    }, 2200);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="border-b border-border bg-zinc-950/70">
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATES.map((item, i) => {
            const active = i === index;

            return (
              <div
                key={item.label}
                className={`border p-4 transition-colors duration-300 ${
                  active
                    ? "border-zinc-500 bg-black/40"
                    : "border-zinc-800 bg-black/20"
                }`}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {item.label}
                </div>

                <div className="text-xl sm:text-2xl md:text-3xl font-bold mt-2">{item.value}</div>

                <div className={`text-xs mt-2 font-medium ${toneClass(item.tone)}`}>
                  {item.delta}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
