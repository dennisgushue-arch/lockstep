import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import LiveOutcomeStrip from "@/components/live-outcome-strip";
import WhoItsFor from "@/components/who-its-for";
import WhatLockstepNotices from "@/components/what-lockstep-notices";
import BeforeAfter from "@/components/before-after";
import DemoIntent from "@/components/demo-intent";
import heroImage from "@assets/generated_images/minimalist_abstract_concrete_architecture,_dramatic_lighting,_black_and_white.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-20 sm:pb-0">
      {/* Hero Section */}
      <section className="relative min-h-[88svh] flex items-center overflow-hidden border-b border-border">
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

            <h1 className="text-4xl sm:text-5xl font-heading font-bold leading-[0.95] tracking-tight">
              YOU SAID YOU WOULD
            </h1>

            <p className="text-lg text-zinc-300">You didn&apos;t. Lockstep makes you pay.</p>

            <p className="text-sm text-zinc-500">
              AI turns your repeated flinch into a pact, then asks for proof.
            </p>

            <div className="flex flex-col gap-3">
            <Link href="/auth">
                <Button className="w-full sm:w-auto sm:self-center rounded-none h-14 px-8 text-base font-black bg-red-600 text-white hover:bg-red-700">
                PROVE YOU MEAN IT
              </Button>
            </Link>

              <a href="#demo" className="w-full sm:w-auto sm:self-center">
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto rounded-none h-14 px-8 text-base border border-zinc-700 bg-transparent hover:bg-zinc-900"
                >
                  SEE THE SYSTEM
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <DemoIntent onLockReal={() => setLocation("/auth")} />

      <WhatLockstepNotices />

      <BeforeAfter />

      {/* Why Lockstep Wins */}
      <section className="py-20 px-5 border-b border-border bg-zinc-950/30">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="space-y-3 text-center max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">Why Lockstep Wins</div>
            <h2 className="text-3xl md:text-5xl font-heading font-bold">Why the flinch gets penalized</h2>
            <p className="text-sm md:text-base text-zinc-400">
              Willpower is cheap. Penalty isn&apos;t.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <div className="border border-zinc-800 bg-black/30 p-5 md:p-6 space-y-3">
              <h3 className="text-xl md:text-2xl font-bold">It sees you flinch early</h3>
              <p className="text-sm md:text-base text-zinc-400">
                The flinch starts before the miss.
              </p>
            </div>

            <div className="border border-zinc-800 bg-black/30 p-5 md:p-6 space-y-3">
              <h3 className="text-xl md:text-2xl font-bold">It adds penalty to the flinch</h3>
              <p className="text-sm md:text-base text-zinc-400">
                Miss the pact. Take the penalty.
              </p>
            </div>

            <div className="border border-zinc-800 bg-black/30 p-5 md:p-6 space-y-3">
              <h3 className="text-xl md:text-2xl font-bold">It asks for proof</h3>
              <p className="text-sm md:text-base text-zinc-400">
                Effort without proof is noise.
              </p>
            </div>

            <div className="border border-zinc-800 bg-black/30 p-5 md:p-6 space-y-3">
              <h3 className="text-xl md:text-2xl font-bold">It ends the inner bargaining</h3>
              <p className="text-sm md:text-base text-zinc-400">
                Proof or penalty.
              </p>
            </div>
          </div>
        </div>
      </section>

      <LiveOutcomeStrip />
      <WhoItsFor />

      {/* Pricing */}
      <section className="py-20 px-5 bg-black border-b border-border">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold">PRICING</h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto">
             <div className="p-5 md:p-6 border border-border bg-zinc-950/50">
               <h3 className="text-xl font-bold font-heading mb-2">Free</h3>
               <p className="text-4xl font-bold mb-6">$0</p>
               <ul className="text-left space-y-2 mb-8 text-sm text-muted-foreground">
                 <li>• 3 Active Pacts</li>
                 <li>• Basic AI Reflection</li>
                 <li>• Manual Proof</li>
               </ul>
             </div>
             <div className="p-5 md:p-6 border border-foreground bg-foreground text-background relative">
               <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs px-2 py-1 font-bold">POPULAR</div>
               <h3 className="text-xl font-bold font-heading mb-2">Pro</h3>
               <p className="text-4xl font-bold mb-6">$12<span className="text-lg font-normal opacity-70">/mo</span></p>
               <ul className="text-left space-y-2 mb-8 text-sm opacity-80">
                 <li>• Unlimited Pacts</li>
                 <li>• Advanced AI Reflection</li>
                 <li>• Social Proof</li>
                 <li>• Auto-Escalation</li>
               </ul>
             </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-5 text-center border-t border-border bg-zinc-950">
        <h2 className="text-4xl md:text-6xl font-heading font-bold mb-8">
          YOU KNOW WHERE YOU KEEP FLINCHING.
        </h2>
        <Link href="/auth">
          <Button size="lg" className="w-full sm:w-auto rounded-none h-14 px-8 text-base sm:text-xl font-bold bg-white text-black hover:bg-gray-200">
            PROOF OR PENALTY
          </Button>
        </Link>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/95 p-3 sm:hidden">
        <Link href="/auth">
          <Button className="w-full rounded-none h-12 text-sm font-black bg-red-600 text-white hover:bg-red-700">
            PROVE YOU MEAN IT
          </Button>
        </Link>
      </div>
    </div>
  );
}
