import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Sync Input Sources - Background job
 * Polls connected input sources for new intent signals
 * Should be called via cron or manual trigger
 */

const SWEEP_SECRET = Deno.env.get("SWEEP_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface SyncResult {
  user_id: string;
  signals_created: number;
  patterns_updated: number;
  new_prompts: number;
}

Deno.serve(async (req) => {
  try {
    // Verify secret for cron jobs
    const authHeader = req.headers.get("x-sweep-secret");
    if (authHeader !== SWEEP_SECRET) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let sources: Array<{ source_type: string; user_id: string }> = [];

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const query = supabase
        .from("input_sources")
        .select("source_type,user_id")
        .eq("connected", "true");

      const { data, error } = user_id === "all"
        ? await query
        : await query.eq("user_id", user_id);

      if (!error && data) {
        sources = data.map((row) => ({
          source_type: row.source_type,
          user_id: row.user_id,
        }));
      }
    }

    if (sources.length === 0) {
      const fallbackUserId = user_id === "all" ? "test-user-123" : user_id;
      sources = [
        { source_type: "message", user_id: fallbackUserId },
        { source_type: "calendar", user_id: fallbackUserId },
      ];
    }

    let signals_created = 0;
    let patterns_updated = 0;
    let new_prompts = 0;

    // Poll each source
    for (const source of sources) {
      try {
        if (source.source_type === "message") {
          // In production: Call messaging API (Twilio, WhatsApp, etc.)
          // Poll recent messages for intent keywords
          
          // Mock: Create signal
          const mockSignals = [
            "I keep saying I'll start that side business",
            "I really need to call my parents more often",
          ];

          for (const text of mockSignals) {
            // Call process_intent_signal for each
            const response = await fetch(`${req.url.replace("sync_input_sources", "process_intent_signal")}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_id: source.user_id,
                source_type: "message",
                raw_text: text,
              }),
            });

            if (response.ok) {
              signals_created++;
              const result = await response.json();
              if (result.should_prompt) new_prompts++;
              if (result.pattern_id) patterns_updated++;
            }
          }
        }

        if (source.source_type === "calendar") {
          // In production: Query Google Calendar/Outlook API
          // Look for repeated event titles or patterns
          
          // Mock: Detect repeated "Gym" events
          const mockCalendarSignal = "Morning workout session (created 5 times, attended 0)";
          
          const response = await fetch(`${req.url.replace("sync_input_sources", "process_intent_signal")}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: source.user_id,
              source_type: "calendar",
              raw_text: mockCalendarSignal,
            }),
          });

          if (response.ok) {
            signals_created++;
            const result = await response.json();
            if (result.should_prompt) new_prompts++;
            if (result.pattern_id) patterns_updated++;
          }
        }
      } catch (error) {
        console.error(`Error syncing ${source.type}:`, error);
        // Continue with other sources
      }
    }

    const result: SyncResult = {
      user_id,
      signals_created,
      patterns_updated,
      new_prompts,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error syncing sources:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
