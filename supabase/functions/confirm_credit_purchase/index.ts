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

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
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
