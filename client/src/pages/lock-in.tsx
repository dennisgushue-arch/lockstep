import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Stakes as StakeScreen } from "@/components/stakes";
import { supabase } from "@/lib/supabase";
import { format, addHours } from "date-fns";
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function LockInPage() {
  const { currentIntent, createCommitment } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  
  // Initialize stake with AI suggestion
  const [stake, setStake] = useState<number>(currentIntent?.suggested_stake ?? 5);
  const [consequence, setConsequence] = useState<'money' | 'social' | 'escalate'>('money');
  const [date, setDate] = useState<Date | undefined>(addHours(new Date(), 24));
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!date) return;
    if (isSubmitting) return;

    // Skip Stripe validation in mock mode (when stripe is null)
    if (!stripe || !elements) {
      console.warn("[Lock-in] Stripe not available - running in mock mode");
      // In mock mode, just create the commitment without payment
      try {
        await createCommitment({
          stakeAmount: stake,
          consequenceType: consequence,
          scheduledDate: date,
        });
        
        toast({
          title: "LOCKED IN (Mock Mode)",
          description: "Commitment created without payment authorization.",
          variant: "default",
        });
        
        setLocation("/dashboard");
        return;
      } catch (error: any) {
        console.error("Lock-in failed - FULL ERROR:", error);
        console.error("Error stack:", error?.stack || 'No stack');
        console.error("Error details:", JSON.stringify(error, null, 2));

        toast({
          title: "Error",
          description: error?.message || "Failed to lock in.",
          variant: "destructive",
        });

        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);

    let commitmentId: string | null = null;

    try {
      // 1) Create commitment
      const commitment = await createCommitment({
        stakeAmount: stake,
        consequenceType: consequence,
        scheduledDate: date,
      });

      commitmentId = commitment?.id ?? null;
      if (!commitmentId) {
        throw new Error("Commitment created but missing id.");
      }

      // 2) Create PaymentIntent (manual capture)
      const amountCents = Math.round(stake * 100);

      const { data: pi, error: piErr } = await supabase.functions.invoke("create_stake_intent", {
        body: { amount_cents: amountCents, commitment_id: commitmentId },
      }) as { data: { client_secret: string; payment_intent_id: string } | null; error: any };

      if (piErr) throw piErr;
      if (!pi?.client_secret || !pi?.payment_intent_id) {
        throw new Error("Payment intent missing client_secret/payment_intent_id");
      }

      // 3) Confirm card payment (authorize) using individual card elements
      const cardNumberElement = elements.getElement(CardNumberElement);
      const cardExpiryElement = elements.getElement(CardExpiryElement);
      const cardCvcElement = elements.getElement(CardCvcElement);
      
      if (!cardNumberElement) throw new Error("Card number input not ready");
      if (!cardExpiryElement) throw new Error("Card expiry input not ready");
      if (!cardCvcElement) throw new Error("Card CVC input not ready");

      const result = await stripe.confirmCardPayment(pi.client_secret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (result.error) throw result.error;

      toast({
        title: "LOCKED IN",
        description: "Your card is authorized. Complete it or the stake is donated.",
        variant: "default",
      });

      setLocation("/dashboard");
    } catch (error: any) {
      console.error("Lock-in failed - FULL ERROR:", error);
      console.error("Error stack:", error?.stack || 'No stack');
      console.error("Error details:", JSON.stringify(error, null, 2));

      toast({
        title: "Error",
        description: error?.message || "Failed to lock in.",
        variant: "destructive",
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
      <div className="space-y-4 relative z-10">
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
              disabled={(d) => d < new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary Confirmation */}
      <div className="bg-zinc-950 border border-border p-6 space-y-4 mt-8">
        <h3 className="text-lg font-bold font-heading">SUMMARY</h3>
        <p className="text-xl leading-relaxed">
          I will{" "}
          <span className="text-white font-bold underline underline-offset-4">
            {currentIntent.action}
          </span>{" "}
          by{" "}
          <span className="text-white font-bold">
            {date ? format(date, "PPP 'at' p") : "..."}
          </span>
          . If I fail, I lose{" "}
          <span className="text-red-500 font-bold">${stake}</span> via {consequence} consequence.
        </p>
      </div>

      <div className="pt-4 space-y-4 relative z-0">
        <div className="border-2 border-zinc-800 p-6 bg-zinc-900/50">
          <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 block">Secure Payment Authorization</Label>
          
          {/* Card Number */}
          <div className="mb-4">
            <Label className="text-xs font-semibold text-zinc-400 block mb-2">Card Number</Label>
            <div className="p-3 bg-black border border-zinc-800 rounded-none pointer-events-auto" style={{ isolation: 'isolate' }}>
              <CardNumberElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      '::placeholder': {
                        color: '#52525b',
                      },
                    },
                  },
                  placeholder: '4242 4242 4242 4242',
                }}
              />
            </div>
          </div>

          {/* Expiry and CVC in a grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-zinc-400 block mb-2">Expiry Date</Label>
              <div className="p-3 bg-black border border-zinc-800 rounded-none pointer-events-auto" style={{ isolation: 'isolate' }}>
                <CardExpiryElement 
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                        '::placeholder': {
                          color: '#52525b',
                        },
                      },
                    },
                    placeholder: 'MM / YY',
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-400 block mb-2">CVC</Label>
              <div className="p-3 bg-black border border-zinc-800 rounded-none pointer-events-auto" style={{ isolation: 'isolate' }}>
                <CardCvcElement 
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                        '::placeholder': {
                          color: '#52525b',
                        },
                      },
                    },
                    placeholder: '123',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <Button 
          size="lg" 
          className="w-full h-16 rounded-none text-xl font-bold bg-white text-black hover:bg-gray-200"
          onClick={handleConfirm}
          disabled={isSubmitting || !date || !stripe}
          data-testid="button-confirm-commitment"
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
