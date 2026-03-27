import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
});

Deno.serve(async (req) => {
  try {
    const { amount, credits, userId } = await req.json();

    if (!amount || !credits || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, credits, userId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a PaymentIntent with IMMEDIATE capture (not manual like stakes)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        type: "credit_purchase",
        user_id: userId,
        credits: credits.toString(),
      },
      description: `Purchase ${credits} credits`,
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating credit purchase payment intent:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
