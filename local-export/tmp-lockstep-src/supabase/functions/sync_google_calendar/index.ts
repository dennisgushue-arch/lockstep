import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBase64 = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!keyBase64) {
    throw new Error("Missing TOKEN_ENCRYPTION_KEY");
  }
  const keyBytes = base64ToBytes(keyBase64);
  if (keyBytes.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes base64");
  }
  return crypto.subtle.importKey(
    "raw",
    (keyBytes.buffer as ArrayBuffer).slice(0, keyBytes.length),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
}

async function decryptToken(payload: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = base64ToBytes(payload);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stored Google token
    const { data: connection, error: connError } = await supabase
      .from("user_source_connections")
      .select("oauth_token_encrypted, refresh_token")
      .eq("user_id", user.id)
      .eq("source_type", "google_calendar")
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Calendar not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt token (simple base64 for demo, use proper decryption in production)
    const accessToken = await decryptToken(connection.oauth_token_encrypted);

    // Fetch events from Google Calendar API
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: "GET",
      }
    );

    if (!calendarResponse.ok) {
      if (calendarResponse.status === 401) {
        // Token expired, need refresh (implement in production)
        throw new Error("Token expired - refresh needed");
      }
      const error = await calendarResponse.text();
      throw new Error(`Calendar API error: ${error}`);
    }

    const calendarData = await calendarResponse.json();
    const events = calendarData.items || [];

    // Filter for upcoming events
    const upcomingEvents = events.filter((event: any) => {
      const startTime = new Date(event.start.dateTime || event.start.date);
      return startTime >= now && startTime <= oneWeekLater;
    });

    // Insert/upsert events into database
    const insertEvents = upcomingEvents.map((event: any) => ({
      user_id: user.id,
      source_type: "google_calendar",
      external_id: event.id,
      title: event.summary || "Untitled",
      start_time: event.start.dateTime || event.start.date,
      end_time: event.end.dateTime || event.end.date,
      description: event.description,
      location: event.location,
      is_all_day: !event.start.dateTime,
      color: event.colorId,
      synced_at: new Date().toISOString(),
    }));

    if (insertEvents.length > 0) {
      const { error: insertError } = await supabase
        .from("calendar_events")
        .upsert(insertEvents, { onConflict: "user_id,external_id" });

      if (insertError) {
        throw new Error(`Insert error: ${insertError.message}`);
      }
    }

    // Update last sync time
    await supabase
      .from("user_source_connections")
      .update({ last_sync_time: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("source_type", "google_calendar");

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: upcomingEvents.length,
        events: upcomingEvents.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
