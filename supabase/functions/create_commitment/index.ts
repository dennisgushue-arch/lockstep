import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error Deno import map resolves this module at runtime
import { createClient } from "jsr:@supabase/supabase-js@2";
import { validateNewCommitment } from "../_shared/user-stats.ts";

/**
 * Create Commitment Function
 * 
 * Creates a new commitment after validating user eligibility and credits.
 * Deducts credits upfront and updates user stats.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const {
      userId,
      intentId,
      intentText,
      actionText,
      creditsCost,
      consequenceType,
      scheduledDate,
      refundOnCompletion = true,
      stripePaymentIntentId,
    } = await req.json();

    // Validate required fields
    if (!userId || !intentText || !creditsCost || !consequenceType || !scheduledDate) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: userId, intentText, creditsCost, consequenceType, scheduledDate",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate the new commitment
    const validation = await validateNewCommitment(
      supabase,
      userId,
      creditsCost,
      scheduledDate
    );

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current user balance
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("credit_balance")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    const currentBalance = parseInt(user.credit_balance || "0");
    const newBalance = currentBalance - creditsCost;

    // Create the commitment
    const { data: commitment, error: commitmentError } = await supabase
      .from("commitments")
      .insert({
        user_id: userId,
        intent_id: intentId,
        intent_text: intentText,
        action_text: actionText ?? intentText ?? null,
        credits_cost: creditsCost.toString(),
        consequence_type: consequenceType,
        scheduled_at: scheduledDate,
        status: "active",
        refund_on_completion: refundOnCompletion,
        stripe_payment_intent_id: stripePaymentIntentId,
      })
      .select()
      .single();

    if (commitmentError) throw commitmentError;

    // Deduct credits from user balance
    const { error: balanceError } = await supabase
      .from("users")
      .update({ credit_balance: newBalance.toString() })
      .eq("id", userId);

    if (balanceError) throw balanceError;

    // Create spend transaction
    const { error: txnError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        type: "spend",
        amount: creditsCost.toString(),
        balance_after: newBalance.toString(),
        description: `Locked in: ${intentText.slice(0, 50)}${intentText.length > 50 ? "..." : ""}`,
        related_commitment_id: commitment.id,
      });

    if (txnError) throw txnError;

    console.log(
      `Created commitment ${commitment.id} for user ${userId}, deducted ${creditsCost} credits`
    );

    return new Response(
      JSON.stringify({
        success: true,
        commitment,
        newBalance,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating commitment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
