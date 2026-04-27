import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error("Stripe webhook credentials not configured");
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-11-20.acacia",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature", { status: 400 });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);

    if (event.type !== "refund.updated" && event.type !== "refund.created") {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const refund = event.data.object as Stripe.Refund;
    const cashoutRequestId = refund.metadata?.cashout_request_id;
    const userId = refund.metadata?.user_id;

    if (!cashoutRequestId || !userId) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: request, error: requestError } = await supabase
      .from("cashout_requests")
      .select("id,user_id,status,credits_requested,usd_amount")
      .eq("id", cashoutRequestId)
      .single();

    if (requestError || !request) {
      return new Response(JSON.stringify({ received: true, missingRequest: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.status === "completed" || request.status === "failed") {
      return new Response(JSON.stringify({ received: true, idempotent: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    if (refund.status === "succeeded") {
      await supabase
        .from("cashout_requests")
        .update({
          status: "completed",
          processed_at: now,
          stripe_payout_id: refund.id,
        })
        .eq("id", cashoutRequestId);

      // Ensure completion transaction is only inserted once.
      const { data: existingTxn } = await supabase
        .from("credit_transactions")
        .select("id")
        .eq("cashout_request_id", cashoutRequestId)
        .eq("type", "cashout_completed")
        .limit(1)
        .maybeSingle();

      if (!existingTxn) {
        const balances = await getUserBalances(supabase, userId);
        await supabase
          .from("credit_transactions")
          .insert({
            user_id: userId,
            type: "cashout_completed",
            amount: request.credits_requested,
            balance_after: balances.total.toString(),
            cashout_request_id: cashoutRequestId,
            usd_amount: Number(request.usd_amount || 0).toFixed(2),
            description: `Batch refund completed: ${request.credits_requested} credits -> $${Number(request.usd_amount || 0).toFixed(2)}`,
          });
      }

      return new Response(JSON.stringify({ received: true, reconciled: "completed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (refund.status === "failed" || refund.status === "canceled") {
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
        .from("cashout_requests")
        .update({
          status: "failed",
          processed_at: now,
          stripe_payout_id: refund.id,
        })
        .eq("id", cashoutRequestId);

      await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          type: "earn",
          amount: credits.toString(),
          balance_after: newTotal.toString(),
          earned_portion: credits.toString(),
          cashout_request_id: cashoutRequestId,
          usd_amount: Number(request.usd_amount || 0).toFixed(2),
          description: `Cashout failed, credits restored: ${credits}`,
        });

      return new Response(JSON.stringify({ received: true, reconciled: "failed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true, pending: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Stripe cashout webhook error:", error);
    return new Response(JSON.stringify({ error: error.message || "Webhook error" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
