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

    // Get current user balance
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("credit_balance")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    const currentBalance = parseInt(user.credit_balance || "0");
    const newBalance = currentBalance + credits;

    // Update user balance
    const { error: updateError } = await supabase
      .from("users")
      .update({ credit_balance: newBalance.toString() })
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
