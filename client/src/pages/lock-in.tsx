import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import React, { useState, useEffect, useMemo } from "react";
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
  const { currentIntent, createCommitment, creditBalance, user, behaviorProfile, commitments } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
  const [invitedWitnessesInput, setInvitedWitnessesInput] = useState("");
  const [challengeMode, setChallengeMode] = useState(false);
  const [teamMembersInput, setTeamMembersInput] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());

  const integrityScore = useMemo(
    () => Math.round((behaviorProfile.completionRate ?? 0) * 100),
    [behaviorProfile.completionRate]
  );

  const adaptiveProofPolicy = useMemo(
    () => getAdaptiveProofPolicy(integrityScore),
    [integrityScore]
  );

  const creditsRequired = calculateCreditsRequired(stake);
  const invitedWitnesses = useMemo(
    () => invitedWitnessesInput.split(",").map((name) => name.trim()).filter(Boolean),
    [invitedWitnessesInput]
  );
  const challengeMemberNames = useMemo(
    () => teamMembersInput.split(",").map((name) => name.trim()).filter(Boolean),
    [teamMembersInput]
  );
  const teamSize = challengeMode ? challengeMemberNames.length + 1 : 1; // +1 for current user
  const splitCreditsPerMember = challengeMode ? Math.max(1, Math.ceil(creditsRequired / teamSize)) : creditsRequired;
  const userCreditsAtRisk = splitCreditsPerMember;
  const hasEnoughCredits = creditBalance >= userCreditsAtRisk;
  const activePactsCount = useMemo(
    () => commitments.filter((item) => item.status === "scheduled").length,
    [commitments]
  );
  const showSecondPactPaywall = activePactsCount >= 1;

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const countdownLabel = useMemo(() => {
    if (!date) return "00:00:00";
    const remaining = Math.max(0, Math.floor((date.getTime() - nowTick) / 1000));
    const h = Math.floor(remaining / 3600).toString().padStart(2, "0");
    const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(remaining % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [date, nowTick]);

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
        title: "Sign in required",
        description: "Sign in to lock this pact.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }
    if (isSubmitting) return;
    
    if (!hasEnoughCredits) {
      toast({
        title: "Not enough credits",
        description: `You need ${userCreditsAtRisk}, but you only have ${creditBalance}.`,
        variant: "destructive",
      });
      return;
    }

    // Validate witness for social consequence
    if (consequence === "social" && (!witnessEnabled || !witnessName.trim())) {
      toast({
        title: "Add a witness",
        description: "Social consequence needs a witness name.",
        variant: "destructive",
      });
      return;
    }

    if (challengeMode && challengeMemberNames.length === 0) {
      toast({
        title: "Add teammates",
        description: "Challenge mode requires at least one teammate name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createCommitment({
        creditsCost: userCreditsAtRisk,
        consequenceType: consequence,
        scheduledDate: date,
        refundOnCompletion,
        proofMethod,
        invitedWitnesses,
        teamChallenge: challengeMode
          ? {
              enabled: true,
              memberNames: challengeMemberNames,
              totalCredits: creditsRequired,
              splitCreditsPerMember,
              confirmedBy: [],
            }
          : null,
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
        title: "Pact locked",
        description: `${userCreditsAtRisk} credits at risk${challengeMode ? ` (team split from total ${creditsRequired})` : ""}. ${refundOnCompletion ? "Finish on time to get them back." : "No refunds on this one."}`,
        variant: "default",
      });
      
      setLocation("/momentum");
    } catch (error: any) {
      console.error("Lock-in failed:", error);
      toast({
        title: "Couldn't lock pact",
        description: error?.message || "Try again in a moment.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 pb-24 space-y-8 premium-screen">
      <div className="space-y-2 text-center">
        <div className="text-xs uppercase tracking-[0.35em] premium-danger font-black">PACT ACTIVATION</div>
        <h1 className="text-4xl sm:text-5xl font-heading premium-headline leading-[0.9]">THIS IS NOW REAL</h1>
        <p className="premium-subtext">No quiet escape now.</p>
      </div>

      <div className="premium-card-active premium-breathe p-7 space-y-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.32em] label-subtle">Pressure window</div>
        <div className="premium-countdown-ring">
          <div className="text-4xl sm:text-5xl font-black premium-countdown">{countdownLabel}</div>
        </div>
        <div className="text-sm premium-subtext">
          Miss this → <span className="premium-danger font-bold premium-stake-pulse px-2 py-1 rounded-md">lose {userCreditsAtRisk} credits</span>
        </div>
      </div>

      {/* Credit Balance Warning */}
      {!hasEnoughCredits && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need {userCreditsAtRisk} credits but only have {creditBalance}.{" "}
            <Link href="/credits" className="underline font-semibold">
              Purchase more credits
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Credit Info Card */}
      <Card className="p-6 premium-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">CREDIT BALANCE</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{creditBalance}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">LOCK COST</p>
            <p className="text-3xl font-bold">{userCreditsAtRisk}</p>
            {challengeMode && (
              <p className="text-xs text-muted-foreground mt-1">Split from total {creditsRequired} ({teamSize} members)</p>
            )}
            <Badge variant={hasEnoughCredits ? "default" : "destructive"} className="mt-2">
              {hasEnoughCredits ? "READY" : "TOP UP"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Stake Amount Selector */}
      <div className="space-y-4">
        <Label className="text-base font-bold">STAKE SIZE</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[5, 10, 25, 50, 100, 250, 500, 1000].map((amount) => {
            const cost = calculateCreditsRequired(amount);
            return (
              <Button
                key={amount}
                variant={stake === amount ? "default" : "outline"}
                className="h-16 sm:h-20 flex flex-col items-center justify-center"
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
        <Label className="text-base font-bold">CHOOSE CONSEQUENCE</Label>
        <div className="grid gap-3">
          <Button
            variant={consequence === 'money' ? "default" : "outline"}
            className="h-16 justify-start"
            onClick={() => setConsequence('money')}
          >
            💸 BURN CREDITS
          </Button>
          <Button
            variant={consequence === 'social' ? "default" : "outline"}
            className="h-16 justify-start"
            onClick={() => setConsequence('social')}
          >
            📢 TRIGGER SHAME POST
          </Button>
          <Button
            variant={consequence === 'escalate' ? "default" : "outline"}
            className="h-16 justify-start"
            onClick={() => setConsequence('escalate')}
          >
            ⚡ DOUBLE NEXT STAKE
          </Button>
        </div>
      </div>

      {/* Proof Method */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-base font-bold">CHOOSE PROOF</Label>
          {adaptiveProofPolicy.required && (
            <span className="text-[10px] uppercase tracking-widest border border-amber-600/50 text-amber-400 px-2 py-0.5">
              TIER LOCK
            </span>
          )}
        </div>
        {adaptiveProofPolicy.nudgeMessage && (
          <div className="text-xs border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-zinc-300">
            {adaptiveProofPolicy.nudgeMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <span className="text-[10px] opacity-60">Tier locked</span>
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
        <Label className="text-base font-bold">SET DEADLINE</Label>
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
              {date ? format(date, "PPP p") : <span>Set deadline</span>}
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
      <Card className="p-4 premium-card">
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
              REFUND ON WIN
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
              ADD WITNESS
            </div>
            <div className="text-sm text-zinc-300 mt-1">
              Miss = witness consequence.
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
              Name first. Add contact later.
            </div>
          </div>
        )}
      </div>

      {/* Invite Friends to Witness */}
      <div className="border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Invite friends to witness</div>
        <div className="text-sm text-zinc-300">Add names (comma-separated) to increase social pressure and network growth.</div>
        <input
          value={invitedWitnessesInput}
          onChange={(e) => setInvitedWitnessesInput(e.target.value)}
          placeholder="e.g., Alex, Jordan, Sam"
          className="w-full bg-black/20 border border-zinc-800 px-3 py-3 text-white outline-none"
        />
        {invitedWitnesses.length > 0 && (
          <div className="text-xs text-zinc-500">Inviting {invitedWitnesses.length} friend{invitedWitnesses.length !== 1 ? "s" : ""} as witnesses.</div>
        )}
      </div>

      {/* Challenge Mode */}
      <div className="border border-violet-900/50 bg-violet-950/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-violet-300">Challenge Mode · Team Pacts</div>
            <div className="text-sm text-zinc-300 mt-1">Split stake among team members for shared accountability.</div>
          </div>
          <button
            type="button"
            onClick={() => setChallengeMode((v) => !v)}
            className={`px-3 py-2 border text-sm ${
              challengeMode
                ? "border-violet-500 bg-violet-700/30 text-violet-100"
                : "border-zinc-700 bg-black/20 text-zinc-400"
            }`}
          >
            {challengeMode ? "ON" : "OFF"}
          </button>
        </div>

        {challengeMode && (
          <>
            <input
              value={teamMembersInput}
              onChange={(e) => setTeamMembersInput(e.target.value)}
              placeholder="Team members (comma-separated), e.g., Alex, Jordan"
              className="w-full bg-black/20 border border-zinc-800 px-3 py-3 text-white outline-none"
            />
            <div className="text-xs text-zinc-400">
              Total stake: {creditsRequired} credits · Team size: {teamSize} · Your share: {splitCreditsPerMember} credits
            </div>
          </>
        )}
      </div>

      {/* Confirm Button */}
      <div className="space-y-4">
        {showSecondPactPaywall && (
          <PressurePaywall triggerLabel="When creating 2nd pact" mode="escalation" />
        )}

        <Button 
          size="lg" 
          className="w-full h-16 text-xl font-black tracking-wide rounded-2xl premium-cta premium-breathe"
          onClick={handleConfirm}
          disabled={isSubmitting || !date || !hasEnoughCredits}
          data-testid="button-confirm-commitment"
        >
          {isSubmitting ? "MAKING IT REAL..." : `MAKE IT REAL (${userCreditsAtRisk} CREDITS)`}
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
