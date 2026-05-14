import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/mock-data";
import { analytics } from "@/lib/analytics";
import heroImage from "@assets/generated_images/minimalist_abstract_concrete_architecture,_dramatic_lighting,_black_and_white.png";
export default function Landing() {
  const { user, commitments } = useApp();

  const localEvents = analytics.getLocalEvents() as Array<Record<string, unknown>>;
  const firstPactCreated = localEvents.filter((event) => event.event === "first_pact_created").length;
  const firstPactCompleted = localEvents.filter((event) => event.event === "first_pact_completed").length;
  const recoveryCreated = localEvents.filter((event) => event.event === "recovery_pact_created");
  const recoveryWithin24h = recoveryCreated.filter((event) => event.within_24h === true).length;
  const firstPactCompletionRate = firstPactCreated > 0 ? Math.round((firstPactCompleted / firstPactCreated) * 100) : 0;
  const recoveryRate = recoveryCreated.length > 0 ? Math.round((recoveryWithin24h / recoveryCreated.length) * 100) : 0;
  const tinyPactWins = commitments.filter((commitment) => commitment.status === "completed" && (commitment.creditsCost ?? 0) <= 5).length;
  const testimonials = [
    "I stopped restarting every Monday.",
    "The tiny pact format made it feel doable.",
  ];

  return (
    <div className="flex flex-col min-h-screen text-white pb-20 sm:pb-0">
      <section className="relative min-h-[88svh] sm:min-h-screen flex items-center overflow-hidden border-b border-border">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Abstract Architecture"
            className="w-full h-full object-cover opacity-20 grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,80,255,0.12),transparent_55%)]" />
        </div>

        <div className="relative z-10 w-full px-5 py-16">
          <div className="space-y-6 text-center max-w-md mx-auto">
            <div className="text-[10px] uppercase tracking-[0.3em] text-danger">Lockstep</div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl xl:text-8xl font-heading font-bold tracking-tight leading-[0.95]">
              STOP BREAKING
              <br />
              PROMISES TO
              <br />
              YOURSELF.
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-muted max-w-2xl">
              Lockstep turns &ldquo;I should&rdquo; into a small commitment you can actually complete.
            </p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.8 }}
              className="text-sm sm:text-base label-subtle max-w-2xl"
            >
              Follow through, build trust, recover fast when you miss.
            </motion.p>

            <div className="flex flex-col gap-3 sm:gap-4">
              <Link href={user ? "/onboarding" : "/auth"}>
                <Button
                  className="w-full rounded-none h-14 sm:h-16 px-8 sm:px-10 text-base sm:text-lg font-black tracking-widest bg-white text-black hover:bg-zinc-200 glow-purple-soft"
                  onClick={() => analytics.track("landing_cta_clicked", { surface: "hero", destination: user ? "/onboarding" : "/auth" })}
                >
                  Download Lockstep
                </Button>
              </Link>
            </div>

            <div className="surface-gradient p-4 text-left glow-purple-soft">
              <div className="text-[10px] uppercase tracking-[0.3em] label-subtle mb-2">System Preview</div>
              <div className="text-sm text-muted">Use the same pressure moment or failure screen preview as the App Store video.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-5 sm:px-6 border-b border-border">
        <div className="max-w-4xl mx-auto space-y-4 text-center">
          <div className="text-xs uppercase tracking-[0.3em] label-subtle">The Problem</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">You keep saying &ldquo;I should.&rdquo;</h2>
          <p className="text-2xl md:text-4xl font-semibold text-muted">Then nothing happens.</p>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-5 sm:px-6 border-b border-border">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.3em] label-subtle">The Solution</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">Turn one &ldquo;I should&rdquo; into one small action&mdash;with something real on the line.</h2>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-6 border-b border-border">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.3em] label-subtle">Reality</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">Get reminders before you slip.</h2>
          <p className="text-2xl md:text-4xl font-semibold text-muted">Build your follow-through score.</p>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-6 border-b border-border">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="text-xs uppercase tracking-[0.3em] label-subtle">Social Proof</div>
          <div className="grid gap-4 md:grid-cols-3 text-left">
            <div className="surface-gradient p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] label-subtle">First pact completion</div>
              <div className="text-3xl font-black text-white mt-2">{firstPactCompletionRate}%</div>
              <div className="text-sm text-subtle mt-2">of locally tracked first pacts get completed.</div>
            </div>
            <div className="surface-gradient p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] label-subtle">Recovery within 24h</div>
              <div className="text-3xl font-black text-white mt-2">{recoveryRate}%</div>
              <div className="text-sm text-subtle mt-2">of local recovery pacts happen the same day.</div>
            </div>
            <div className="surface-gradient p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] label-subtle">Tiny pact wins</div>
              <div className="text-3xl font-black text-white mt-2">{tinyPactWins}</div>
              <div className="text-sm text-subtle mt-2">completed wins started with 5 credits or less.</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((quote) => (
              <blockquote key={quote} className="surface-card p-5 text-xl font-semibold text-zinc-100">
                “{quote}”
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-5 sm:px-6 text-center border-t border-border">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-heading font-bold leading-tight mb-5">
          Missed? Recover with one small win.
        </h2>
        <div className="max-w-md mx-auto">
          <Link href={user ? "/onboarding" : "/auth"}>
            <Button
              size="lg"
              className="w-full rounded-none h-14 sm:h-16 px-10 sm:px-12 text-base sm:text-xl font-black bg-white text-black hover:bg-zinc-200 glow-purple-soft"
              onClick={() => analytics.track("landing_cta_clicked", { surface: "footer", destination: user ? "/onboarding" : "/auth" })}
            >
              Get the app
            </Button>
          </Link>
        </div>
      </section>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-black/95 p-3 sm:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <Link href={user ? "/onboarding" : "/auth"}>
          <Button
            className="w-full rounded-none h-12 text-sm font-black bg-white text-black hover:bg-zinc-200"
            onClick={() => analytics.track("landing_cta_clicked", { surface: "mobile_sticky", destination: user ? "/onboarding" : "/auth" })}
          >
            Download Lockstep
          </Button>
        </Link>
      </div>
    </div>
  );
}
