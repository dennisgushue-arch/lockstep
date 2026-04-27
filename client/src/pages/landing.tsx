import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/mock-data";
import heroImage from "@assets/generated_images/minimalist_abstract_concrete_architecture,_dramatic_lighting,_black_and_white.png";
export default function Landing() {
  const { user } = useApp();

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-20 sm:pb-0">
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
            <div className="text-[10px] uppercase tracking-[0.3em] text-red-400">Lockstep</div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl xl:text-8xl font-heading font-bold tracking-tight leading-[0.95]">
              STOP SAYING IT.
              <br />
              DO IT.
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-zinc-300 max-w-2xl">
              Follow through—or lose.
            </p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.8 }}
              className="text-sm sm:text-base text-zinc-500 max-w-2xl"
            >
              pressure → action → consequence
            </motion.p>

            <div className="flex flex-col gap-3 sm:gap-4">
              <Link href={user ? "/capture" : "/auth"}>
                <Button className="w-full rounded-none h-14 sm:h-16 px-8 sm:px-10 text-base sm:text-lg font-black tracking-widest bg-white text-black hover:bg-zinc-200">
                  Download Lockstep
                </Button>
              </Link>

              <a href="#how-it-works" className="w-full">
                <Button
                  variant="secondary"
                  className="w-full rounded-none h-12 px-8 text-sm tracking-widest bg-transparent border border-zinc-700 hover:bg-zinc-900"
                >
                  SEE HOW IT WORKS
                </Button>
              </a>
            </div>

            <div className="border border-zinc-800 bg-black/40 p-4 text-left">
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">System Preview</div>
              <div className="text-sm text-zinc-300">Use the same pressure moment or failure screen preview as the App Store video.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-5 sm:px-6 border-b border-border">
        <div className="max-w-4xl mx-auto space-y-4 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">The Problem</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">You already know what you should do.</h2>
          <p className="text-2xl md:text-4xl font-semibold text-zinc-300">You don&apos;t do it.</p>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-5 sm:px-6 border-b border-border bg-zinc-950/30">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">The Solution</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">Lockstep makes it cost you.</h2>
        </div>
      </section>

      <section id="how-it-works" className="py-16 sm:py-24 px-5 sm:px-6 border-b border-border">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">How It Works</div>
            <h2 className="text-3xl md:text-5xl font-heading font-bold">pressure → action → consequence</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <div className="border border-zinc-800 bg-black/30 p-5 sm:p-6 space-y-3 text-center">
              <h3 className="text-xl md:text-2xl font-bold">Say it</h3>
              <p className="text-sm md:text-base text-zinc-400">Name what you keep promising yourself.</p>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-5 sm:p-6 space-y-3 text-center">
              <h3 className="text-xl md:text-2xl font-bold">Lock it in</h3>
              <p className="text-sm md:text-base text-zinc-400">Put real consequence on the line.</p>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-5 sm:p-6 space-y-3 text-center">
              <h3 className="text-xl md:text-2xl font-bold">Follow through—or don&apos;t</h3>
              <p className="text-sm md:text-base text-zinc-400">If you miss, you pay.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-6 border-b border-border bg-zinc-950/40">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">Reality</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">Most people stop at intention.</h2>
          <p className="text-2xl md:text-4xl font-semibold text-zinc-300">Lockstep doesn&apos;t.</p>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-6 border-b border-border">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">Social Proof</div>
          <blockquote className="text-2xl md:text-3xl font-semibold text-zinc-100">
            “I actually did it because I didn&apos;t want to lose.”
          </blockquote>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-5 sm:px-6 text-center border-t border-border bg-zinc-950">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-heading font-bold leading-tight mb-5">
          Your word should mean something.
        </h2>
        <div className="max-w-md mx-auto">
          <Link href={user ? "/capture" : "/auth"}>
            <Button size="lg" className="w-full rounded-none h-14 sm:h-16 px-10 sm:px-12 text-base sm:text-xl font-black bg-white text-black hover:bg-zinc-200">
              Get the app
            </Button>
          </Link>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/95 p-3 sm:hidden">
        <Link href={user ? "/capture" : "/auth"}>
          <Button className="w-full rounded-none h-12 text-sm font-black bg-white text-black hover:bg-zinc-200">
            Download Lockstep
          </Button>
        </Link>
      </div>
    </div>
  );
}
