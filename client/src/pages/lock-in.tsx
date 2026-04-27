import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format, addHours } from "date-fns";
import { CalendarIcon, Coins, AlertCircle, Brain, ShieldAlert, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import PressurePaywall from "@/components/pressure-paywall";
import {
  getAdaptiveProofPolicy,
  getProofConfidence,
  getProofConfidenceLabel,
  getProofMethodLabel,
  suggestProofMethodForTask,
  type ProofMethod,
} from "@/lib/proof";

/** Map AdaptiveProofMethod names to ProofMethod used by proof.ts */
function mapAdaptiveToProofMethod(m: string): ProofMethod {
  if (m === "check_in") return "checkin";
  if (m === "location") return "photo";
  if (m === "witness" || m === "photo" || m === "text") return m as ProofMethod;
  return "checkin";
}

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
  const { currentIntent, createCommitment, creditBalance, user, behaviorProfile, psychProfile, commitments } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const pactSizeBadge =
    currentIntent?.pact_size_level === "tiny"
      ? "border-yellow-500/50 text-yellow-300 bg-yellow-500/10"
      : currentIntent?.pact_size_level === "small"
        ? "border-sky-500/50 text-sky-300 bg-sky-500/10"
        : currentIntent?.pact_size_level === "expanded"
          ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10"
          : "border-zinc-700 text-zinc-300 bg-zinc-900/50";
  const parsedIntentDeadline = currentIntent?.deadline ? new Date(currentIntent.deadline) : null;
  const initialDeadline = parsedIntentDeadline && !Number.isNaN(parsedIntentDeadline.getTime())
    ? parsedIntentDeadline
    : addHours(new Date(), 24);
  
  // Initialize stake with AI suggestion
  const [stake, setStake] = useState<number>(currentIntent?.suggested_stake ?? 5);
  const [consequence, setConsequence] = useState<'money' | 'social' | 'escalate'>('money');
  const [date, setDate] = useState<Date | undefined>(initialDeadline);
  const [refundOnCompletion, setRefundOnCompletion] = useState(true);
  const [proofMethod, setProofMethod] = useState<ProofMethod>(
    suggestProofMethodForTask(currentIntent?.category)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Witness state
  const [witnessEnabled, setWitnessEnabled] = useState(false);
  const [witnessName, setWitnessName] = useState("");
  const [witnessRelationship, setWitnessRelationship] = useState("");
  const [witnessContact, setWitnessContact] = useState("");

  const integrityScore = useMemo(
    () => Math.round((behaviorProfile.completionRate ?? 0) * 100),
    [behaviorProfile.completionRate]
  );

  const adaptiveProofPolicy = useMemo(
    () => getAdaptiveProofPolicy(integrityScore),
    [integrityScore]
  );

  const composedPressureLine = useMemo(() => {
    const base = psychProfile?.next_pressure_line ?? behaviorProfile.psych.next_pressure_line;
    return base || "";
  }, [psychProfile?.next_pressure_line, behaviorProfile.psych.next_pressure_line]);

  const creditsRequired = calculateCreditsRequired(stake);
  const hasEnoughCredits = creditBalance >= creditsRequired;
  const activePactsCount = useMemo(
    () => commitments.filter((item) => item.status === "scheduled").length,
    [commitments]
  );
  const showSecondPactPaywall = activePactsCount >= 1;

  useEffect(() => {
    if (!currentIntent) {
      setLocation("/capture");
    } else if (stake === 5) {
      // Update stake when intent changes (initial load)
      setStake(currentIntent.suggested_stake);
      // Prefer AI-recommended method, otherwise fall back to task-based suggestion
      const aiMethod = currentIntent.proof_method
        ? mapAdaptiveToProofMethod(currentIntent.proof_method)
        : suggestProofMethodForTask(currentIntent.category);
      const policy = getAdaptiveProofPolicy(integrityScore);
      const methodOrder: ProofMethod[] = ["checkin", "photo", "text", "witness"];
      const aiRank = methodOrder.indexOf(aiMethod);
      const minRank = methodOrder.indexOf(policy.minimumMethod);
      setProofMethod(aiRank >= minRank ? aiMethod : policy.minimumMethod);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIntent, setLocation]);

  // When witness is enabled, upgrade proof method to witness
  useEffect(() => {
    if (witnessEnabled) setProofMethod("witness");
  }, [witnessEnabled]);

  if (!currentIntent) return null;

  const handleConfirm = async () => {
    if (!date) return;
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be signed in to lock in a pact.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }
    if (isSubmitting) return;
    
    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${creditsRequired} credits but only have ${creditBalance}.`,
        variant: "destructive",
      });
      return;
    }

    // Validate witness for social consequence
    if (consequence === "social" && (!witnessEnabled || !witnessName.trim())) {
      toast({
        title: "Witness Required",
        description: "A witness is required for social consequence mode.",
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
        proofMethod,
        witness:
          witnessEnabled && witnessName.trim()
            ? {
                name: witnessName.trim(),
                relationship: witnessRelationship.trim() || null,
                contact: witnessContact.trim() || null,
              }
            : null,
      });
      
      toast({
        title: "LOCKED IN",
        description: `${creditsRequired} credits spent. ${refundOnCompletion ? "Complete it to get them back!" : "No refunds - make it count!"}`,
        variant: "default",
      });
      
      setLocation("/momentum");
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

      {/* AI Proof Recommendation */}
      {currentIntent.proof_method && (
        <div className="border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-zinc-400" />
            <span className="text-xs uppercase tracking-widest text-zinc-500">AI Proof Recommendation</span>
          </div>
          <div className="text-base font-bold text-white">
            {currentIntent.proof_method.toUpperCase().replace(/_/g, " ")}
          </div>
          {currentIntent.proof_confidence && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Confidence:</span>
              <Badge variant="outline" className="text-xs uppercase">
                {currentIntent.proof_confidence}
              </Badge>
            </div>
          )}
          {currentIntent.proof_reason && (
            <p className="text-xs text-zinc-500">{currentIntent.proof_reason}</p>
          )}
        </div>
      )}

      {/* Proof Method */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-base font-bold">PROOF METHOD</Label>
          {adaptiveProofPolicy.required && (
            <span className="text-[10px] uppercase tracking-widest border border-amber-600/50 text-amber-400 px-2 py-0.5">
              Tier requirement
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          How will you prove completion?
        </p>

        {adaptiveProofPolicy.nudgeMessage && (
          <div className="text-xs border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-zinc-300">
            {adaptiveProofPolicy.nudgeMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {([
            "checkin",
            "photo",
            "text",
            "witness",
          ] as ProofMethod[]).map((method) => {
            const confidence = getProofConfidence(method);
            const active = proofMethod === method;
            const locked = !adaptiveProofPolicy.allowedMethods.includes(method);
            return (
              <Button
                key={method}
                variant={active ? "default" : "outline"}
                disabled={locked}
                className="h-auto min-h-20 py-3 flex flex-col items-start gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => !locked && setProofMethod(method)}
              >
                <span className="text-sm font-semibold">{getProofMethodLabel(method)}</span>
                <span className="text-xs opacity-80">
                  Confidence: {getProofConfidenceLabel(confidence)}
                </span>
                {locked && (
                  <span className="text-[10px] opacity-60">Not available at your tier</span>
                )}
              </Button>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          Proof confidence: <span className="font-semibold">{getProofConfidenceLabel(getProofConfidence(proofMethod))}</span>
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

      {/* Witness Mode */}
      <div className="border border-zinc-800 bg-zinc-950/40 p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Witness Mode
            </div>
            <div className="text-sm text-zinc-300 mt-1">
              If you miss, this person becomes part of the consequence.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWitnessEnabled((v) => !v)}
            className={`px-3 py-2 border text-sm ${
              witnessEnabled
                ? "border-red-700 bg-red-950/20 text-red-300"
                : "border-zinc-700 bg-black/20 text-zinc-400"
            }`}
          >
            {witnessEnabled ? "ON" : "OFF"}
          </button>
        </div>

        {witnessEnabled && (
          <div className="grid gap-3">
            <input
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              placeholder="Witness name"
              className="w-full bg-black/20 border border-zinc-800 px-3 py-3 text-white outline-none"
            />

            <input
              value={witnessRelationship}
              onChange={(e) => setWitnessRelationship(e.target.value)}
              placeholder="Relationship (friend, partner, coach)"
              className="w-full bg-black/20 border border-zinc-800 px-3 py-3 text-white outline-none"
            />

            <input
              value={witnessContact}
              onChange={(e) => setWitnessContact(e.target.value)}
              placeholder="Optional contact info"
              className="w-full bg-black/20 border border-zinc-800 px-3 py-3 text-white outline-none"
            />

            <div className="text-xs text-zinc-500">
              Start simple: name is enough. Contact can be added later.
            </div>
          </div>
        )}
      </div>

      {/* Pre-Failure Psych Signal */}
      {(psychProfile || behaviorProfile) && ((psychProfile?.pattern_warning || behaviorProfile?.psych.pattern_warning) || (psychProfile?.next_pressure_line || behaviorProfile?.psych.next_pressure_line)) && (
        <Card className="border border-amber-500/40 bg-amber-950/20 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Psych Engine</span>
            {behaviorProfile.completionRate > 0 && (
              <Badge variant="outline" className="ml-auto text-xs border-amber-600/50 text-amber-400">
                {Math.round(behaviorProfile.completionRate * 100)}% honor rate
              </Badge>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-200">{psychProfile?.pattern_warning ?? behaviorProfile.psych.pattern_warning}</p>
            </div>
            <div className="flex gap-3">
              <Zap className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
              <p className="text-sm text-sky-200">{composedPressureLine}</p>
            </div>
            {currentIntent?.pact_size_reason && (
              <div className="space-y-2">
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-widest border ${pactSizeBadge}`}>
                  Pact Size: {currentIntent.pact_size_level ?? "standard"}
                </span>
                <div className="text-xs text-zinc-300">{currentIntent.pact_size_reason}</div>
              </div>
            )}
            {currentIntent?.pact_size_level === "tiny" && (
              <div className="text-sm text-yellow-400">
                This was reduced to make sure you actually start.
              </div>
            )}
          </div>
          {behaviorProfile.riskPatterns.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {behaviorProfile.riskPatterns.map((risk) => (
                <Badge key={risk} variant="outline" className="text-xs border-red-700/50 text-red-400">
                  {risk}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Confirm Button */}
      <div className="space-y-4">
        {showSecondPactPaywall && (
          <PressurePaywall triggerLabel="When creating 2nd pact" mode="escalation" />
        )}

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
