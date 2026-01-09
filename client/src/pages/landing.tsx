import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImage from "@assets/generated_images/minimalist_abstract_concrete_architecture,_dramatic_lighting,_black_and_white.png";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col justify-center items-center text-center px-4 overflow-hidden border-b border-border">
        <div className="absolute inset-0 z-0">
           <img 
            src={heroImage} 
            alt="Abstract Architecture" 
            className="w-full h-full object-cover opacity-30 grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-8xl font-heading font-bold tracking-tighter leading-tight"
          >
            STOP SAYING <br/>
            <span className="text-muted-foreground">"I SHOULD"</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto"
          >
            Start doing — automatically. <br/>
            This app is not gentle.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link href="/auth">
              <Button size="lg" className="rounded-none h-20 px-12 text-2xl font-black bg-white text-black hover:bg-white/90 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none transition-all">
                LOCK YOUR FIRST INTENT — FREE
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-4 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto space-y-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold">THE PROBLEM</h2>
          <div className="space-y-6 text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
            <p>
              <span className="text-foreground font-medium">Willpower is a finite resource.</span> You wake up with good intentions, but by 6 PM, the day has eroded your resolve.
            </p>
            <p>
              You don't need another todo list. You don't need a gentle nudge. You need a consequence that actually matters.
            </p>
            <p>
              We built Lockstep for people who are tired of letting themselves down.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 bg-zinc-900/30 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-16 text-center">HOW IT WORKS</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: "01", title: "Declare", desc: "State your intent. Use your voice or text. Be specific." },
              { step: "02", title: "Stake", desc: "Put skin in the game. Money, social reputation, or escalation." },
              { step: "03", title: "Execute", desc: "Do it. Mark it complete. Or pay the price." }
            ].map((item) => (
              <div key={item.step} className="border-l-2 border-border pl-6 space-y-4">
                <span className="text-4xl font-mono text-muted-foreground/30 font-bold">{item.step}</span>
                <h3 className="text-2xl font-bold font-heading">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold">PRICING</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
             <div className="p-8 border border-border bg-card/50">
               <h3 className="text-xl font-bold font-heading mb-2">Free</h3>
               <p className="text-4xl font-bold mb-6">$0</p>
               <ul className="text-left space-y-2 mb-8 text-sm text-muted-foreground">
                 <li>• 3 Active Commitments</li>
                 <li>• Basic Reflection AI</li>
                 <li>• Manual Verification</li>
               </ul>
             </div>
             <div className="p-8 border border-foreground bg-foreground text-background relative">
               <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs px-2 py-1 font-bold">POPULAR</div>
               <h3 className="text-xl font-bold font-heading mb-2">Pro</h3>
               <p className="text-4xl font-bold mb-6">$12<span className="text-lg font-normal opacity-70">/mo</span></p>
               <ul className="text-left space-y-2 mb-8 text-sm opacity-80">
                 <li>• Unlimited Commitments</li>
                 <li>• Advanced Reflection AI</li>
                 <li>• Social Witnesses</li>
                 <li>• Hard Mode (Auto-Escalation)</li>
               </ul>
             </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4 text-center border-t border-border bg-zinc-950">
        <h2 className="text-4xl md:text-6xl font-heading font-bold mb-8">
          ENOUGH TALK.
        </h2>
        <Link href="/auth">
          <Button size="lg" className="rounded-none h-16 px-12 text-xl font-bold bg-white text-black hover:bg-gray-200">
            JOIN THE WAITLIST
          </Button>
        </Link>
      </section>
    </div>
  );
}
