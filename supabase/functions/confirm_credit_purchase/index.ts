import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const { userId, credits, paymentIntentId } = await req.json();

    if (!userId || !credits || !paymentIntentId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    if (!stripeSecretKey) {
      throw new Error("Stripe credentials not configured");
    }

    const paymentIntentResponse = await fetch(
      `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`,
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!paymentIntentResponse.ok) {
      const stripeError = await paymentIntentResponse.text();
      throw new Error(`Stripe validation failed: ${stripeError}`);
    }

    const paymentIntent = await paymentIntentResponse.json();
    const intentStatus = paymentIntent?.status;
    const metadata = paymentIntent?.metadata ?? {};

    if (intentStatus !== "succeeded") {
      throw new Error(`Payment not completed: ${intentStatus}`);
    }

    if (metadata?.user_id && metadata.user_id !== userId) {
      throw new Error("Payment intent user mismatch");
    }

    if (metadata?.credits && Number(metadata.credits) !== Number(credits)) {
      throw new Error("Payment intent credits mismatch");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const getBalances = async () => {
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
    };

    const balances = await getBalances();
    const newPurchasedBalance = balances.purchased + Number(credits);
    const newBalance = newPurchasedBalance + balances.earned;

    // Update user balance (purchased bucket)
    const updatePayload = balances.splitSupported
      ? {
          credit_balance: newBalance.toString(),
          purchased_credit_balance: newPurchasedBalance.toString(),
          earned_credit_balance: balances.earned.toString(),
        }
      : {
          credit_balance: newBalance.toString(),
        };

    const { error: updateError } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) throw updateError;

    // Create transaction record
    const { error: txnError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        type: "purchase",
        amount: credits.toString(),
        balance_after: newBalance.toString(),
        purchased_portion: credits.toString(),
        earned_portion: "0",
        description: `Purchased ${credits} credits`,
        stripe_payment_intent_id: paymentIntentId,
      });

    if (txnError) throw txnError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        newBalance,
        credits
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error confirming credit purchase:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
