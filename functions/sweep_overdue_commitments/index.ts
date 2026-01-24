import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * GET or POST allowed.
 * Finds overdue commitments and marks them failed.
 * Adjust the query conditions to match your schema (due_date, timezone, status values).
 */
serve(async (req) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("commitments")
      .select("id")
      .lt("due_date", now)
      .not("status", "in", "('failed','completed')")
      .limit(1000); // implement pagination if you expect >1000

    if (error) {
      console.error("Error querying overdue commitments:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const ids = (data || []).map((r: any) => r.id);
    let processed = 0;

    for (const id of ids) {
      const { error: updateErr } = await supabase
        .from("commitments")
        .update({ status: "failed", failed_at: new Date().toISOString() })
        .eq("id", id)
        .limit(1);

      if (updateErr) {
        console.error(`Failed to update commitment ${id}:`, updateErr);
        continue;
      }
      processed++;
      // optionally insert audit row, emit event, notify, etc.
    }

    return new Response(JSON.stringify({ processed, ids }), { status: 200 });
  } catch (err: any) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
