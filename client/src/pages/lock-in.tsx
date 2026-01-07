import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Stakes as StakeScreen } from "@/components/stakes";
import { format, addHours } from "date-fns";
import { CalendarIcon, Loader2, DollarSign, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function LockInPage() {
  const { currentIntent, createCommitment } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [stake, setStake] = useState<number>(5);
  const [consequence, setConsequence] = useState<'money' | 'social' | 'escalate'>('money');
  const [date, setDate] = useState<Date | undefined>(addHours(new Date(), 24));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentIntent) {
      setLocation("/capture");
    }
  }, [currentIntent, setLocation]);

  if (!currentIntent) return null;

  const handleConfirm = async () => {
    if (!date) return;
    
    setIsSubmitting(true);
    try {
      await createCommitment({
        stakeAmount: stake,
        consequenceType: consequence,
        scheduledDate: date
      });
      toast({
        title: "LOCKED IN",
        description: "Your commitment is live. Good luck.",
      });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create commitment.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 pb-24 space-y-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-heading font-bold">DEFINE THE STAKES</h1>
        <p className="text-muted-foreground">Make it painful to fail.</p>
      </div>

      <StakeScreen 
        stake={stake} 
        setStake={setStake} 
        consequence={consequence} 
        setConsequence={setConsequence} 
      />

      {/* Schedule */}
      <div className="space-y-4">
        <Label className="text-base font-bold">DEADLINE</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full h-16 justify-start text-left font-normal text-lg rounded-none border-2",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-5 w-5" />
              {date ? format(date, "PPP p") : <span>Pick a deadline</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              disabled={(date) => date < new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary Confirmation */}
      <div className="bg-zinc-950 border border-border p-6 space-y-4 mt-8">
        <h3 className="text-lg font-bold font-heading">SUMMARY</h3>
        <p className="text-xl leading-relaxed">
          I will <span className="text-white font-bold underline underline-offset-4">{currentIntent.action}</span> by <span className="text-white font-bold">{date ? format(date, "PPP 'at' p") : '...'}</span>.
          If I fail, I lose <span className="text-red-500 font-bold">${stake}</span> via {consequence} consequence.
        </p>
      </div>

      <div className="pt-4">
        <Button 
          size="lg" 
          className="w-full h-16 rounded-none text-xl font-bold bg-white text-black hover:bg-gray-200"
          onClick={handleConfirm}
          disabled={isSubmitting || !date}
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "CONFIRM COMMITMENT"}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Payment authorized via Stripe. Released upon completion. Captured upon failure.
        </p>
      </div>
    </div>
  );
}
