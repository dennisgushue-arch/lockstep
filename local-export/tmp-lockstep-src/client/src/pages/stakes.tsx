import React, { useState } from "react";
import { Stakes as StakeScreen } from "@/components/stakes";
import { Button } from "@/components/ui/button";

export default function StakesPage() {
  const [stake, setStake] = useState<number>(5);
  const [consequence, setConsequence] = useState<'money' | 'social' | 'escalate'>('money');

  return (
    <div className="container max-w-3xl mx-auto px-4 py-12 space-y-12">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-heading font-bold tracking-tighter">THE PRICE OF FAILURE</h1>
        <p className="text-muted-foreground text-lg">Define what you lose if you quit.</p>
      </div>

      <div className="bg-zinc-900/50 p-8 border-2 border-border">
        <StakeScreen 
          stake={stake} 
          setStake={setStake} 
          consequence={consequence} 
          setConsequence={setConsequence} 
        />
      </div>

      <div className="pt-8 flex flex-col items-center gap-4">
        <Button size="lg" className="w-full max-w-sm h-16 text-xl font-bold rounded-none">
          SET STAKES
        </Button>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          This app is not gentle.
        </p>
      </div>
    </div>
  );
}
