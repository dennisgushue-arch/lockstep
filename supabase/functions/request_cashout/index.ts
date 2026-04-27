import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CREDITS_PER_DOLLAR = 10;
const MIN_CASHOUT_CREDITS = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UserBalances = {
  total: number;
  purchased: number;
  earned: number;
  splitSupported: boolean;
};

async function getUserBalances(supabase: ReturnType<typeof createClient>, userId: string): Promise<UserBalances> {
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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { userId, creditsRequested } = await req.json();

    const credits = Number(creditsRequested);
    if (!userId || !Number.isFinite(credits)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, creditsRequested" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (credits < MIN_CASHOUT_CREDITS || !Number.isInteger(credits)) {
      return new Response(
        JSON.stringify({ error: `Minimum cashout is ${MIN_CASHOUT_CREDITS} credits` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const balances = await getUserBalances(supabase, userId);

    if (balances.earned < credits) {
      return new Response(
        JSON.stringify({ error: "Insufficient earned credits for cashout" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usdAmount = credits / CREDITS_PER_DOLLAR;
    const now = new Date().toISOString();

    const { data: request, error: requestError } = await supabase
      .from("cashout_requests")
      .insert({
        user_id: userId,
        credits_requested: credits.toString(),
        usd_amount: usdAmount.toFixed(2),
        status: "pending",
        payout_method: "batch",
        requested_at: now,
      })
      .select()
      .single();

    if (requestError) throw requestError;

    const newEarned = balances.earned - credits;
    const newTotal = balances.purchased + newEarned;

    const updatePayload = balances.splitSupported
      ? {
          credit_balance: newTotal.toString(),
          purchased_credit_balance: balances.purchased.toString(),
          earned_credit_balance: newEarned.toString(),
        }
      : {
          credit_balance: newTotal.toString(),
        };

    const { error: updateError } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) throw updateError;

    const { error: txnError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        type: "cashout_request",
        amount: credits.toString(),
        balance_after: newTotal.toString(),
        earned_portion: credits.toString(),
        usd_amount: usdAmount.toFixed(2),
        cashout_request_id: request.id,
        description: `Cashout requested: ${credits} credits ($${usdAmount.toFixed(2)})`,
      });

    if (txnError) throw txnError;

    return new Response(
      JSON.stringify({
        success: true,
        request: {
          id: request.id,
          status: "pending",
          creditsRequested: credits,
          usdAmount,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error requesting cashout:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
