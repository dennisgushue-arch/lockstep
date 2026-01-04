import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

      <div className="grid gap-8 md:grid-cols-2">
        {/* Stake Amount */}
        <div className="space-y-4">
          <Label className="text-base font-bold">STAKE AMOUNT</Label>
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
              >
                ${amount}
                <span className="text-xs font-normal opacity-70">USD</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Consequence Type */}
        <div className="space-y-4">
          <Label className="text-base font-bold">CONSEQUENCE TYPE</Label>
          <RadioGroup value={consequence} onValueChange={(v: any) => setConsequence(v)} className="flex flex-col gap-4">
            <div className={cn("flex items-start space-x-3 border-2 p-4 cursor-pointer transition-colors", consequence === 'money' ? "border-primary bg-primary/5" : "border-border")}>
              <RadioGroupItem value="money" id="money" className="mt-1" />
              <Label htmlFor="money" className="cursor-pointer">
                <div className="font-bold flex items-center gap-2"><DollarSign className="w-4 h-4"/> Financial Forfeit</div>
                <div className="text-sm text-muted-foreground mt-1">Money is donated to a charity you hate if you miss the deadline.</div>
              </Label>
            </div>
            
            <div className={cn("flex items-start space-x-3 border-2 p-4 cursor-pointer transition-colors", consequence === 'social' ? "border-primary bg-primary/5" : "border-border")}>
              <RadioGroupItem value="social" id="social" className="mt-1" />
              <Label htmlFor="social" className="cursor-pointer">
                <div className="font-bold flex items-center gap-2"><Users className="w-4 h-4"/> Social Witness</div>
                <div className="text-sm text-muted-foreground mt-1">We email your boss/partner that you failed to complete this task.</div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

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
