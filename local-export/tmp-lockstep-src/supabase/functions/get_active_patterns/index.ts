import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Get Active Patterns
 * Returns all active intent patterns for a user that should trigger prompts
 */

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isAnonAuth = !!supabaseAnonKey && authHeader.trim() === `Bearer ${supabaseAnonKey}`;
    const useUserAuth = authHeader && !isAnonAuth;
    const supabaseKey = useUserAuth ? supabaseAnonKey : (supabaseServiceRoleKey ?? supabaseAnonKey);

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      useUserAuth ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: patterns, error } = await supabase
      .from("intent_patterns")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "active")
      .order("last_detected_at", { ascending: false })
      .limit(Number.isFinite(limit) ? limit : 50);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ patterns: patterns ?? [] }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error getting patterns:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
