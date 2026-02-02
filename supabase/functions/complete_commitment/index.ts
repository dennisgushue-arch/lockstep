import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Complete Commitment Function
 * 
 * Called when a user marks a commitment as complete.
 * If refundOnCompletion is true, credits are refunded to the user.
 */

Deno.serve(async (req) => {
  try {
    const { commitmentId, userId } = await req.json();

    if (!commitmentId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing commitmentId or userId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get commitment details
    const { data: commitment, error: fetchError } = await supabase
      .from("commitments")
      .select("*")
      .eq("id", commitmentId)
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;
    if (!commitment) throw new Error("Commitment not found");

    // Update commitment status
    const { error: updateError } = await supabase
      .from("commitments")
      .update({ status: "completed" })
      .eq("id", commitmentId);

    if (updateError) throw updateError;

    // Refund credits if enabled
    if (commitment.refund_on_completion) {
      // Get current user balance
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("credit_balance")
        .eq("id", userId)
        .single();

      if (userError) throw userError;

      const currentBalance = parseInt(user.credit_balance || "0");
      const newBalance = currentBalance + parseInt(commitment.credits_cost || "0");

      // Update user balance
      const { error: balanceError } = await supabase
        .from("users")
        .update({ credit_balance: newBalance.toString() })
        .eq("id", userId);

      if (balanceError) throw balanceError;

      // Create refund transaction
      const { error: txnError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          type: "refund",
          amount: commitment.credits_cost,
          balance_after: newBalance.toString(),
          description: `Refund for completing commitment`,
          related_commitment_id: commitmentId,
        });

      if (txnError) throw txnError;

      console.log(`Refunded ${commitment.credits_cost} credits to user ${userId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Commitment completed",
        refunded: commitment.refund_on_completion,
        creditsRefunded: commitment.refund_on_completion ? parseInt(commitment.credits_cost) : 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error completing commitment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

