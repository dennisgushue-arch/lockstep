import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format, addHours } from "date-fns";
import { CalendarIcon, Coins, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";

// Credit cost tiers based on stake amount
const CREDIT_TIERS = [
  { min: 0, max: 10, credits: 10 },
  { min: 11, max: 25, credits: 20 },
  { min: 26, max: 50, credits: 35 },
  { min: 51, max: 100, credits: 60 },
  { min: 101, max: 250, credits: 120 },
  { min: 251, max: Infinity, credits: 200 },
];

function calculateCreditsRequired(stakeAmount: number): number {
  const tier = CREDIT_TIERS.find(t => stakeAmount >= t.min && stakeAmount <= t.max);
  return tier?.credits ?? 10;
}

export default function LockInPage() {
  const { currentIntent, createCommitment, creditBalance, user } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Initialize stake with AI suggestion
  const [stake, setStake] = useState<number>(currentIntent?.suggested_stake ?? 5);
  const [consequence, setConsequence] = useState<'money' | 'social' | 'escalate'>('money');
  const [date, setDate] = useState<Date | undefined>(addHours(new Date(), 24));
  const [refundOnCompletion, setRefundOnCompletion] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const creditsRequired = calculateCreditsRequired(stake);
  const hasEnoughCredits = creditBalance >= creditsRequired;

  useEffect(() => {
    if (!currentIntent) {
      setLocation("/capture");
    } else if (stake === 5) {
      // Update stake when intent changes (initial load)
      setStake(currentIntent.suggested_stake);
    }
  }, [currentIntent, setLocation]);

  if (!currentIntent) return null;

  const handleConfirm = async () => {
    if (!date || !user) return;
    if (isSubmitting) return;
    
    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${creditsRequired} credits but only have ${creditBalance}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createCommitment({
        creditsCost: creditsRequired,
        consequenceType: consequence,
        scheduledDate: date,
        refundOnCompletion,
      });
      
      toast({
        title: "LOCKED IN",
        description: `${creditsRequired} credits spent. ${refundOnCompletion ? "Complete it to get them back!" : "No refunds - make it count!"}`,
        variant: "default",
      });
      
      setLocation("/dashboard");
    } catch (error: any) {
      console.error("Lock-in failed:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to lock in.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 pb-24 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-heading font-bold">DEFINE THE STAKES</h1>
        <p className="text-muted-foreground">Make it painful to fail.</p>
      </div>

      {/* Credit Balance Warning */}
      {!hasEnoughCredits && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need {creditsRequired} credits but only have {creditBalance}.{" "}
            <Link href="/credits" className="underline font-semibold">
              Purchase more credits
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Credit Info Card */}
      <Card className="p-6 bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Your Credit Balance</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{creditBalance}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Cost to Lock In</p>
            <p className="text-3xl font-bold">{creditsRequired}</p>
            <Badge variant={hasEnoughCredits ? "default" : "destructive"} className="mt-2">
              {hasEnoughCredits ? "Can Afford" : "Insufficient"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Stake Amount Selector */}
      <div className="space-y-4">
        <Label className="text-base font-bold">SYMBOLIC STAKE AMOUNT</Label>
        <p className="text-sm text-muted-foreground">
          Choose a symbolic dollar amount. You'll spend {creditsRequired} credits (not actual money).
        </p>
        <div className="grid grid-cols-4 gap-3">
          {[5, 10, 25, 50, 100, 250, 500, 1000].map((amount) => {
            const cost = calculateCreditsRequired(amount);
            return (
              <Button
                key={amount}
                variant={stake === amount ? "default" : "outline"}
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => setStake(amount)}
              >
                <span className="text-lg font-bold">${amount}</span>
                <span className="text-xs text-muted-foreground">{cost} credits</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Consequence Type */}
      <div className="space-y-4">
        <Label className="text-base font-bold">CONSEQUENCE TYPE</Label>
        <div className="grid gap-3">
          <Button
            variant={consequence === 'money' ? "default" : "outline"}
            className="h-16 justify-start"
            onClick={() => setConsequence('money')}
          >
            💸 Lose Credits Forever
          </Button>
          <Button
            variant={consequence === 'social' ? "default" : "outline"}
            className="h-16 justify-start"
            onClick={() => setConsequence('social')}
          >
            📢 Public Shame Post
          </Button>
          <Button
            variant={consequence === 'escalate' ? "default" : "outline"}
            className="h-16 justify-start"
            onClick={() => setConsequence('escalate')}
          >
            ⚡ Double the Next Stake
          </Button>
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
                "w-full h-16 justify-start text-left font-normal text-lg",
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
              disabled={(d) => d < new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Refund Option */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="refund"
            checked={refundOnCompletion}
            onCheckedChange={(checked) => setRefundOnCompletion(checked as boolean)}
          />
          <div className="flex-1">
            <label
              htmlFor="refund"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Refund credits on completion
            </label>
            <p className="text-sm text-muted-foreground mt-1">
              {refundOnCompletion 
                ? "Get your credits back if you complete the commitment." 
                : "No refunds. Burn the credits either way - maximum commitment mode."}
            </p>
          </div>
        </div>
      </Card>

      {/* Confirm Button */}
      <div className="space-y-4">
        <Button 
          size="lg" 
          className="w-full h-16 text-xl font-bold"
          onClick={handleConfirm}
          disabled={isSubmitting || !date || !hasEnoughCredits}
          data-testid="button-confirm-commitment"
        >
          {isSubmitting ? "Locking In..." : `LOCK IN (Spend ${creditsRequired} Credits)`}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {refundOnCompletion 
            ? `Credits will be refunded if you complete on time. Otherwise, they're gone forever.`
            : `Credits will be spent regardless of outcome. No refunds.`}
        </p>
      </div>
    </div>
  );
}
