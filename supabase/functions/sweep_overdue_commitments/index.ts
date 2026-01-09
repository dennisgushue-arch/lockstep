import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

// We'll call your fail_commitment function over HTTP
const FAIL_FN_URL = `${SUPABASE_URL}/functions/v1/fail_commitment`;

serve(async (req) => {
try {
const secret = req.headers.get("x-cron-secret");
if (!secret || secret !== CRON_SECRET) {
return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const { data: rows, error } = await admin
.from("commitments")
.select("id")
.eq("status", "active")
.eq("stake_status", "authorized")
.lt("deadline_at", new Date().toISOString())
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
"x-cron-secret": CRON_SECRET,
},
body: JSON.stringify({ commitment_id: r.id }),
});

const json = await res.json();
if (!res.ok) throw new Error(json?.error || `fail_commitment ${res.status}`);
ok += 1;
failed.push(r.id);
} catch (e) {
errors.push({ id: r.id, error: (e as Error).message });
}
}

return new Response(JSON.stringify({ ok: true, scanned: rows?.length ?? 0, failed, errors }), {
status: 200,
});
} catch (e) {
return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400 });
}
});

Yes, use pg_cron (it’s installed) to run every minute, but have it invoke an Edge Function sweep so Stripe capture happens server-side.
For realtime, skip broadcast triggers for MVP — we’ll rely on postgres_changes subscriptions on the commitments table filtered by user_id for now.
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sweep_overdue_commitments' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
