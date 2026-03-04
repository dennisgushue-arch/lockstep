import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCommitmentFailed } from "../_shared/user-stats.ts";
import { StructuredLogger, generateRequestId, auditLog } from "../_shared/logging.ts";

/**
 * Fail Commitment Function
 * 
 * Called when a commitment deadline passes without completion.
 * IDEMPOTENT: Safe to call multiple times - detects already-processed commitments.
 * In the credits system, this doesn't require payment capture since
 * credits were already spent upfront. We just mark the commitment as failed.
 */

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const logger = new StructuredLogger(requestId, "fail_commitment");

  try {
    const sweepSecret = Deno.env.get("SWEEP_SECRET") || "";
    const providedSecret =
      req.headers.get("x-sweep-secret") ||
      req.headers.get("x-cron-secret") ||
      "";

    if (sweepSecret && providedSecret !== sweepSecret) {
      logger.error("invalid_sweep_secret");
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          requestId,
          alreadyProcessed: false,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const { commitmentId, userId } = await req.json();

    if (!commitmentId) {
      logger.error("Missing commitmentId");
      return new Response(
        JSON.stringify({ 
          error: "Missing commitmentId",
          requestId,
          alreadyProcessed: false
        }),
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
      .single();

    if (fetchError) throw fetchError;
    if (!commitment) throw new Error("Commitment not found");

    const commitmentUserId = commitment.user_id;

    // IDEMPOTENCY GUARD: Check if already processed
    const alreadyFailed = commitment.status === "missed" || commitment.status === "failed";
    const alreadyCaptured = commitment.stake_captured_at !== null;

    if (alreadyFailed && alreadyCaptured) {
      logger.info("commitment_already_processed", {
        commitmentId,
        status: commitment.status,
        stakeCapturedAt: commitment.stake_captured_at,
        lastSweepRequestId: commitment.last_sweep_request_id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Commitment already marked as failed",
          commitmentId,
          requestId,
          alreadyProcessed: true,
          previousRequestId: commitment.last_sweep_request_id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const statusBefore = commitment.status;

    // Update commitment status to 'missed'
    const { error: updateError } = await supabase
      .from("commitments")
      .update({
        status: "missed",
        failed_at: new Date().toISOString(),
        last_sweep_at: new Date().toISOString(),
        last_sweep_request_id: requestId,
      })
      .eq("id", commitmentId);

    if (updateError) throw updateError;

    logger.logCommitment(commitmentId, statusBefore, "missed", {
      creditsForfeit: commitment.credits_cost,
      stakeAmount: commitment.stake_amount,
    });

    // Note: Credits were already spent when the commitment was created
    // No need to capture payment or deduct credits here
    // If refundOnCompletion was false, credits are already gone
    // If refundOnCompletion was true, they simply don't get refunded

    logger.info("commitment_failed_credits_forfeited", {
      commitmentId,
      creditsCost: commitment.credits_cost,
    });

    // Update user stats
    try {
      await handleCommitmentFailed(supabase, commitmentUserId, commitmentId);
    } catch (statsError: any) {
      // Log error but don't fail the request
      logger.warn("user_stats_update_failed", {
        error: statsError?.message,
        commitmentId,
      });
    }

    // Audit log
    try {
      await auditLog(
        supabase,
        commitmentId,
        commitmentUserId,
        requestId,
        "fail",
        statusBefore,
        "missed"
      );
    } catch (auditError: any) {
      logger.warn("audit_log_failed", { error: auditError?.message });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Commitment marked as failed",
        commitmentId,
        requestId,
        alreadyProcessed: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    logger.error("commitment_fail_error", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        requestId,
        alreadyProcessed: false
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
