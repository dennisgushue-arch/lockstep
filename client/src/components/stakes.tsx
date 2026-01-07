import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DollarSign, Users } from "lucide-react";

interface StakesProps {
  stake: number;
  setStake: (stake: number) => void;
  consequence: 'money' | 'social' | 'escalate';
  setConsequence: (v: 'money' | 'social' | 'escalate') => void;
  commitmentId?: string;
  onSuccess?: () => void;
}

export function Stakes({ stake, setStake, consequence, setConsequence, commitmentId, onSuccess }: StakesProps) {
  return (
    <div className="space-y-8">
      {commitmentId && (
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-none flex justify-between items-center">
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Tracking Reference</p>
            <p className="text-sm font-mono text-primary font-bold">{commitmentId}</p>
          </div>
          {onSuccess && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 rounded-none text-[10px] font-bold uppercase tracking-widest border-primary/50 hover:bg-primary hover:text-primary-foreground"
              onClick={onSuccess}
            >
              Authorize
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Stake Amount */}
        <div className="space-y-4">
          <label className="text-base font-bold uppercase tracking-tight">Stake Amount</label>
          <div className="grid grid-cols-3 gap-4">
            {[5, 10, 20].map((amount) => (
              <Button
                key={amount}
                variant={stake === amount ? "default" : "outline"}
                className={cn(
                  "h-24 text-2xl font-bold flex flex-col gap-1 rounded-none border-2",
                  stake === amount ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground"
                )}
                onClick={() => setStake(amount)}
                data-testid={`button-stake-${amount}`}
              >
                ${amount}
                <span className="text-xs font-normal opacity-70 uppercase">USD</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Consequence Type */}
        <div className="space-y-4">
          <label className="text-base font-bold uppercase tracking-tight">Consequence Type</label>
          <div className="flex flex-col gap-4">
            <div 
              className={cn(
                "flex items-start space-x-3 border-2 p-4 cursor-pointer transition-colors", 
                consequence === 'money' ? "border-primary bg-primary/5" : "border-border hover:border-foreground"
              )}
              onClick={() => setConsequence('money')}
              data-testid="card-consequence-money"
            >
              <div className="pt-1">
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", consequence === 'money' ? "border-primary" : "border-muted-foreground")}>
                  {consequence === 'money' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </div>
              <div>
                <div className="font-bold flex items-center gap-2 uppercase tracking-tight">
                  <DollarSign className="w-4 h-4 text-primary"/> Financial Forfeit
                </div>
                <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Money is donated to a charity you hate if you miss the deadline.
                </div>
              </div>
            </div>
            
            <div 
              className={cn(
                "flex items-start space-x-3 border-2 p-4 cursor-pointer transition-colors", 
                consequence === 'social' ? "border-primary bg-primary/5" : "border-border hover:border-foreground"
              )}
              onClick={() => setConsequence('social')}
              data-testid="card-consequence-social"
            >
               <div className="pt-1">
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", consequence === 'social' ? "border-primary" : "border-muted-foreground")}>
                  {consequence === 'social' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </div>
              <div>
                <div className="font-bold flex items-center gap-2 uppercase tracking-tight">
                  <Users className="w-4 h-4 text-primary"/> Social Witness
                </div>
                <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  We email your boss/partner that you failed to complete this task.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
