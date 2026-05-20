import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESURFACE_SECRET = Deno.env.get("RESURFACE_SECRET") ?? "";

const ACTION_PATTERNS = [
  "i should",
  "i need to",
  "i'll",
  "i will",
  "promise",
  "follow up",
  "remind",
  "don't forget",
  "must",
  "have to",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-resurface-secret, content-type",
      },
    });
  }

  // Authenticate cron / admin calls
  const provided = req.headers.get("x-resurface-secret") ?? "";
  if (RESURFACE_SECRET && provided !== RESURFACE_SECRET) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const cutoff7d = new Date(Date.now() - 7 * 86400000).toISOString();
    const cutoff5d = new Date(Date.now() - 5 * 86400000).toISOString();

    // 1. Fetch all active memories not yet resurfaced
    const { data: memories, error } = await admin
      .from("echo_memories")
      .select("id, content, people, emotional_weight, created_at, resurface")
      .eq("resurface", "false")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const toResurface: string[] = [];

    for (const m of memories ?? []) {
      const lower = (m.content ?? "").toLowerCase();
      const agePastThreshold = m.created_at < cutoff7d;
      const agePast5d = m.created_at < cutoff5d;

      // Action language pattern
      const hasAction = ACTION_PATTERNS.some((p) => lower.includes(p));
      // Old memory with people
      const people = (() => {
        try {
          return JSON.parse(m.people ?? "[]");
        } catch {
          return [];
        }
      })();
      const oldWithPeople = agePastThreshold && Array.isArray(people) && people.length > 0;
      // Sentimental moment
      const isSentimental = m.emotional_weight === "high" && agePast5d;

      if (hasAction || oldWithPeople || isSentimental) {
        toResurface.push(m.id);
      }
    }

    if (toResurface.length > 0) {
      await admin
        .from("echo_memories")
        .update({ resurface: "true" })
        .in("id", toResurface.slice(0, 20)); // Cap at 20 per run
    }

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: memories?.length ?? 0,
        resurfaced: Math.min(toResurface.length, 20),
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
