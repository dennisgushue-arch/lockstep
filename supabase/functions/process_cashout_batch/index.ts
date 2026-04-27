import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-batch-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UserBalances = {
  total: number;
  purchased: number;
  earned: number;
  splitSupported: boolean;
};

async function getUserBalances(supabase: ReturnType<typeof createClient>, userId: string): Promise<UserBalances> {
  const splitAttempt = await supabase
    .from("users")
    .select("credit_balance,purchased_credit_balance,earned_credit_balance")
    .eq("id", userId)
    .single();

  if (!splitAttempt.error && splitAttempt.data) {
    return {
      total: parseInt(splitAttempt.data.credit_balance || "0"),
      purchased: parseInt(splitAttempt.data.purchased_credit_balance || "0"),
      earned: parseInt(splitAttempt.data.earned_credit_balance || "0"),
      splitSupported: true,
    };
  }

  const legacyAttempt = await supabase
    .from("users")
    .select("credit_balance")
    .eq("id", userId)
    .single();

  if (legacyAttempt.error || !legacyAttempt.data) {
    throw legacyAttempt.error || new Error("User not found");
  }

  const total = parseInt(legacyAttempt.data.credit_balance || "0");
  return {
    total,
    purchased: total,
    earned: 0,
    splitSupported: false,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const batchSecret = Deno.env.get("BATCH_PAYOUT_SECRET") || "";
    if (batchSecret) {
      const provided = req.headers.get("x-batch-secret") || req.headers.get("x-sweep-secret") || "";
      if (provided !== batchSecret) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { limit = 25 } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }
    if (!stripeSecretKey) {
      throw new Error("Stripe credentials not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-11-20.acacia",
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pendingRequests, error: pendingError } = await supabase
      .from("cashout_requests")
      .select("id,user_id,credits_requested,usd_amount,status")
      .eq("status", "pending")
      .order("requested_at", { ascending: true })
      .limit(Math.max(1, Math.min(100, Number(limit) || 25)));

    if (pendingError) throw pendingError;

    const results: Array<{ id: string; status: string; details?: string }> = [];

    for (const request of pendingRequests || []) {
      const requestId = request.id;
      const userId = request.user_id;

      try {
        const amountCents = Math.round(Number(request.usd_amount || "0") * 100);
        if (amountCents <= 0) {
          throw new Error("Invalid cashout amount");
        }

        const { data: latestPurchase, error: purchaseError } = await supabase
          .from("credit_transactions")
          .select("stripe_payment_intent_id")
          .eq("user_id", userId)
          .eq("type", "purchase")
          .not("stripe_payment_intent_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (purchaseError || !latestPurchase?.stripe_payment_intent_id) {
          throw new Error("No refundable payment intent found for user");
        }

        const paymentIntentId = latestPurchase.stripe_payment_intent_id;
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        const refundableAmount = (pi.amount_received || 0) - (pi.amount_refunded || 0);

        if (refundableAmount < amountCents) {
          throw new Error(`Refundable amount too low on payment intent ${paymentIntentId}`);
        }

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amountCents,
          metadata: {
            cashout_request_id: requestId,
            user_id: userId,
          },
          reason: "requested_by_customer",
        });

        const { error: markProcessingError } = await supabase
          .from("cashout_requests")
          .update({
            status: "processing",
            stripe_payout_id: refund.id,
          })
          .eq("id", requestId)
          .eq("status", "pending");

        if (markProcessingError) throw markProcessingError;

        results.push({ id: requestId, status: "processing", details: refund.id });
      } catch (error: any) {
        // Re-credit earned balance if processing failed
        try {
          const balances = await getUserBalances(supabase, userId);
          const credits = parseInt(request.credits_requested || "0");
          const newEarned = balances.earned + credits;
          const newTotal = balances.purchased + newEarned;

          const updatePayload = balances.splitSupported
            ? {
                credit_balance: newTotal.toString(),
                purchased_credit_balance: balances.purchased.toString(),
                earned_credit_balance: newEarned.toString(),
              }
            : {
                credit_balance: newTotal.toString(),
              };

          await supabase
            .from("users")
            .update(updatePayload)
            .eq("id", userId);

          await supabase
            .from("credit_transactions")
            .insert({
              user_id: userId,
              type: "earn",
              amount: credits.toString(),
              balance_after: newTotal.toString(),
              earned_portion: credits.toString(),
              cashout_request_id: requestId,
              usd_amount: Number(request.usd_amount || 0).toFixed(2),
              description: `Cashout reverted: ${credits} credits restored`,
            });
        } catch (recreditError) {
          console.error("Failed to re-credit after cashout processing error", recreditError);
        }

        await supabase
          .from("cashout_requests")
          .update({
            status: "failed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", requestId)
          .eq("status", "pending");

        results.push({ id: requestId, status: "failed", details: error?.message || "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: pendingRequests?.length || 0,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing cashout batch:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
