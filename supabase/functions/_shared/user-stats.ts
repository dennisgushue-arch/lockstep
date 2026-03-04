/**
 * User Stats Management
 * 
 * Shared utilities for managing user statistics across commitment lifecycle.
 */

// @ts-expect-error Deno resolves JSR specifiers at runtime via import maps.
import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

interface UserStats {
  id: string;
  user_id: string;
  total_commitments_created: string;
  total_commitments_completed: string;
  total_commitments_failed: string;
  current_streak: string;
  longest_streak: string;
  total_credits_spent: string;
  total_credits_earned: string;
  total_credits_refunded: string;
  last_commitment_at: string | null;
  last_completion_at: string | null;
  last_failure_at: string | null;
  perks: string;
  created_at: string;
  updated_at: string;
}

/**
 * Ensure user stats exist for a user, creating defaults if needed
 */
export async function ensureUserStats(
  supabase: SupabaseClient,
  userId: string
): Promise<UserStats> {
  const { data: existing, error: fetchError } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!fetchError && existing) {
    return existing;
  }

  // Create default stats
  const { data: created, error: createError } = await supabase
    .from("user_stats")
    .insert({
      user_id: userId,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create user stats: ${createError.message}`);
  }

  return created;
}

/**
 * Called when a commitment is successfully completed
 * Updates completion stats, streak, and handles credit refunds
 */
export async function handleCommitmentCompleted(
  supabase: SupabaseClient,
  userId: string,
  commitmentId: string,
  creditsRefunded: number = 0
): Promise<void> {
  // Ensure stats exist
  const stats = await ensureUserStats(supabase, userId);

  const totalCompleted = parseInt(stats.total_commitments_completed) + 1;
  const currentStreak = parseInt(stats.current_streak) + 1;
  const longestStreak = Math.max(currentStreak, parseInt(stats.longest_streak));
  const totalCreditsRefunded = parseInt(stats.total_credits_refunded) + creditsRefunded;

  // Update stats
  const { error: updateError } = await supabase
    .from("user_stats")
    .update({
      total_commitments_completed: totalCompleted.toString(),
      current_streak: currentStreak.toString(),
      longest_streak: longestStreak.toString(),
      total_credits_refunded: totalCreditsRefunded.toString(),
      last_completion_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Error updating user stats on completion:", updateError);
    throw updateError;
  }

  console.log(
    `[handleCommitmentCompleted] User ${userId}: completed=${totalCompleted}, streak=${currentStreak}/${longestStreak}`
  );
}

/**
 * Called when a commitment fails (missed deadline or manually marked failed)
 * Updates failure stats and resets streak
 */
export async function handleCommitmentFailed(
  supabase: SupabaseClient,
  userId: string,
  commitmentId: string
): Promise<void> {
  // Ensure stats exist
  const stats = await ensureUserStats(supabase, userId);

  const totalFailed = parseInt(stats.total_commitments_failed) + 1;

  // Reset streak on failure
  const { error: updateError } = await supabase
    .from("user_stats")
    .update({
      total_commitments_failed: totalFailed.toString(),
      current_streak: "0",
      last_failure_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Error updating user stats on failure:", updateError);
    throw updateError;
  }

  console.log(
    `[handleCommitmentFailed] User ${userId}: failed=${totalFailed}, streak reset`
  );
}

/**
 * Called when a new commitment is created
 * Validates the commitment and updates creation stats
 */
export async function validateNewCommitment(
  supabase: SupabaseClient,
  userId: string,
  creditsCost: number,
  scheduledDate: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Ensure stats exist
    const stats = await ensureUserStats(supabase, userId);

    // Get user's current credit balance
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("credit_balance")
      .eq("id", userId)
      .single();

    if (userError) {
      return { valid: false, error: `Failed to fetch user: ${userError.message}` };
    }

    const creditBalance = parseInt(user.credit_balance || "0");

    // Validate: user has enough credits
    if (creditBalance < creditsCost) {
      return {
        valid: false,
        error: `Insufficient credits. Balance: ${creditBalance}, Required: ${creditsCost}`,
      };
    }

    // Validate: scheduled date is in the future
    const scheduledTime = new Date(scheduledDate).getTime();
    const now = new Date().getTime();
    
    if (scheduledTime <= now) {
      return {
        valid: false,
        error: "Scheduled date must be in the future",
      };
    }

    // Optional: Add additional validations here
    // - Maximum active commitments
    // - Minimum time between commitments
    // - etc.

    // Update creation stats
    const totalCreated = parseInt(stats.total_commitments_created) + 1;
    const totalSpent = parseInt(stats.total_credits_spent) + creditsCost;

    const { error: updateError } = await supabase
      .from("user_stats")
      .update({
        total_commitments_created: totalCreated.toString(),
        total_credits_spent: totalSpent.toString(),
        last_commitment_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating user stats on creation:", updateError);
      // Don't block commitment creation if stats update fails
      // Just log the error
    }

    console.log(
      `[validateNewCommitment] User ${userId}: created=${totalCreated}, spent=${totalSpent}`
    );

    return { valid: true };
  } catch (error: any) {
    console.error("Error in validateNewCommitment:", error);
    return { valid: false, error: error.message || "Validation failed" };
  }
}
