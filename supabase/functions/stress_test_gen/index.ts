import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { StructuredLogger, generateRequestId } from "../_shared/logging.ts";

/**
 * Stress Test Generator
 * 
 * Creates overdue commitments for stress testing.
 * This endpoint is ADMIN ONLY and should be protected in production.
 * 
 * POST /functions/v1/stress_test_gen
 * {
 *   "userId": "user_id",
 *   "numCommitments": 10,
 *   "dueMinutesAgo": 5,
 *   "stakeAmount": 100
 * }
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

  const requestId = generateRequestId();
  const logger = new StructuredLogger(requestId, "stress_test_gen");

  try {
    const {
      userId,
      numCommitments = 10,
      dueMinutesAgo = 5,
      stakeAmount = 100,
    } = await req.json();

    if (!userId || numCommitments < 1) {
      logger.error("Invalid request parameters");
      return new Response(
        JSON.stringify({
          error: "Missing or invalid: userId, numCommitments",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit stress test size for safety
    if (numCommitments > 1000) {
      return new Response(
        JSON.stringify({
          error: "numCommitments cannot exceed 1000",
          requestId,
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

    // Create scheduled date in the past (overdue)
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() - dueMinutesAgo);
    const scheduledAt = dueDate.toISOString();

    logger.info("creating_test_commitments", {
      numCommitments,
      userId,
      scheduledAt,
      stakeAmount,
    });

    // Batch insert commitments
    const commitments = Array.from({ length: numCommitments }, (_, i) => ({
      user_id: userId,
      intent_text: `[STRESS TEST ${i + 1}] Test commitment ${i + 1} of ${numCommitments}`,
      action_text: `[STRESS TEST ${i + 1}] Test commitment ${i + 1} of ${numCommitments}`,
      credits_cost: stakeAmount.toString(),
      consequence_type: "money",
      scheduled_at: scheduledAt,
      status: "active",
      refund_on_completion: false,
      created_at: new Date().toISOString(),
    }));

    const { data: created, error: insertError } = await supabase
      .from("commitments")
      .insert(commitments)
      .select("id, scheduled_at, status, stake_amount, consequence_type, action_text, stripe_payment_intent_id");

    if (insertError) throw insertError;

    logger.info("test_commitments_created", {
      count: created?.length,
      firstId: created?.[0]?.id,
      lastId: created?.[created.length - 1]?.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        created: created?.length || 0,
        commitmentIds: created?.map((c: any) => c.id) || [],
        scheduledAt,
        level: numCommitments <= 10 ? "Level 1 (Mini)" : numCommitments <= 50 ? "Level 2 (Concurrency)" : "Level 3+ (Volume)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    logger.error("stress_test_gen_error", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
