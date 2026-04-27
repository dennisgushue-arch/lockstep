import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCommitmentCompleted } from "../_shared/user-stats.ts";
import { StructuredLogger, generateRequestId, auditLog } from "../_shared/logging.ts";

/**
 * Complete Commitment Function
 * 
 * Called when a user marks a commitment as complete.
 * If refundOnCompletion is true, credits are refunded to the user.
 */

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const logger = new StructuredLogger(requestId, "complete_commitment");

  try {
    const { commitmentId, userId } = await req.json();

    if (!commitmentId || !userId) {
      logger.error("Missing commitmentId or userId");
      return new Response(
        JSON.stringify({ 
          error: "Missing commitmentId or userId",
          requestId
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

    // Get commitment details
    const { data: commitment, error: fetchError } = await supabase
      .from("commitments")
      .select("*")
      .eq("id", commitmentId)
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;
    if (!commitment) throw new Error("Commitment not found");

    const statusBefore = commitment.status;

    // Update commitment status
    const { error: updateError } = await supabase
      .from("commitments")
      .update({ 
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", commitmentId);

    if (updateError) throw updateError;

    let creditsRefunded = 0;

    // Refund credits if enabled
    if (commitment.refund_on_completion) {
      const balances = await getBalances();
      const refundAmount = parseInt(commitment.credits_cost || "0");
      const newEarnedBalance = balances.earned + refundAmount;
      const newBalance = balances.purchased + newEarnedBalance;
      creditsRefunded = refundAmount;

      // Update user balance (earned bucket)
      const updatePayload = balances.splitSupported
        ? {
            credit_balance: newBalance.toString(),
            purchased_credit_balance: balances.purchased.toString(),
            earned_credit_balance: newEarnedBalance.toString(),
          }
        : {
            credit_balance: newBalance.toString(),
          };

      const { error: balanceError } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", userId);

      if (balanceError) throw balanceError;

      // Create earn transaction
      const { error: txnError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          type: "earn",
          amount: commitment.credits_cost,
          balance_after: newBalance.toString(),
          earned_portion: refundAmount.toString(),
          description: `Earned back for completing commitment`,
          related_commitment_id: commitmentId,
        });

      if (txnError) throw txnError;

      logger.info("commitment_credits_refunded", {
        commitmentId,
        creditsRefunded: refundAmount,
        newBalance,
      });
    }

    logger.logCommitment(commitmentId, statusBefore, "completed", {
      creditsRefunded,
      refundEnabled: commitment.refund_on_completion,
    });

    // Update user stats
    try {
      await handleCommitmentCompleted(supabase, userId, commitmentId, creditsRefunded);
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
        userId,
        requestId,
        "complete",
        statusBefore,
        "completed",
        undefined,
        { creditsRefunded }
      );
    } catch (auditError: any) {
      logger.warn("audit_log_failed", { error: auditError?.message });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Commitment completed",
        commitmentId,
        requestId,
        refunded: commitment.refund_on_completion,
        creditsRefunded,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    logger.error("commitment_complete_error", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        requestId
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
