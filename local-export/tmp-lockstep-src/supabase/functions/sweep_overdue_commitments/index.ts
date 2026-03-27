import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use ONE secret name. We'll accept both headers to avoid mismatches.
const SWEEP_SECRET = Deno.env.get("SWEEP_SECRET") || "";

// Call fail_commitment via the public functions endpoint (not /functions/v1 off SUPABASE_URL)
const FAIL_FN_URL = `${SUPABASE_URL}/functions/v1/fail_commitment`;

serve(async (req) => {
  try {
    // ✅ Cron auth: accept either header name
    const provided =
      req.headers.get("x-sweep-secret") ||
      req.headers.get("x-cron-secret") ||
      "";

    if (!SWEEP_SECRET) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing SWEEP_SECRET" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!provided || provided !== SWEEP_SECRET) {
      return new Response(
        JSON.stringify({ error: "Forbidden: bad secret" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ✅ Service role client (no Authorization header needed)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ✅ IMPORTANT: Your DB uses scheduled_at + stake_amount (and may not have stake_status/deadline_at)
    const { data: rows, error } = await admin
      .from("commitments")
      .select("id, stripe_payment_intent_id, stake_amount, scheduled_at, status")
      .eq("status", "active")
      .lte("scheduled_at", new Date().toISOString())
      .not("stripe_payment_intent_id", "is", null)
      .gt("stake_amount", 0)
      .limit(25);

    if (error) throw error;

    let ok = 0;
    const failed: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const r of rows || []) {
      try {
        const res = await fetch(FAIL_FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // forward the same secret so fail_commitment can allow cron too
            "X-SWEEP-SECRET": SWEEP_SECRET,
          },
          body: JSON.stringify({ commitmentId: r.id }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (json as any)?.error || `fail_commitment ${res.status}`
          );
        }

        ok += 1;
        failed.push(r.id);
      } catch (e) {
        errors.push({ id: r.id, error: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: rows?.length ?? 0,
        ok_count: ok,
        failed,
        errors,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
});