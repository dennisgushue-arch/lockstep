import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * POST body: { id: "<commitment-id>" }
 * Behavior: mark commitment as failed (sets status and failed_at)
 * NOTE: Minimal implementation — no Stripe interaction.
 */
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
    }

    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!id) {
      return new Response(JSON.stringify({ error: "missing id in request body" }), { status: 400 });
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("commitments")
      .update({ status: "failed", failed_at: now })
      .eq("id", id)
      .limit(1);

    if (error) {
      console.error("Error updating commitment:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
