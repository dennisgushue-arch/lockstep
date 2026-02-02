import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Fail Commitment Function
 * 
 * Called when a commitment deadline passes without completion.
 * In the credits system, this doesn't require payment capture since
 * credits were already spent upfront. We just mark the commitment as failed.
 */

Deno.serve(async (req) => {
  try {
    const { commitmentId } = await req.json();

    if (!commitmentId) {
      return new Response(
        JSON.stringify({ error: "Missing commitmentId" }),
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

    // Update commitment status to 'missed'
    const { error: updateError } = await supabase
      .from("commitments")
      .update({ status: "missed" })
      .eq("id", commitmentId);

    if (updateError) throw updateError;

    // Note: Credits were already spent when the commitment was created
    // No need to capture payment or deduct credits here
    // If refundOnCompletion was false, credits are already gone
    // If refundOnCompletion was true, they simply don't get refunded

    console.log(`Commitment ${commitmentId} marked as failed. Credits were forfeited.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Commitment marked as failed",
        commitmentId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error failing commitment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

