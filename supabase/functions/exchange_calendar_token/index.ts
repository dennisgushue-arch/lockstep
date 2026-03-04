import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
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
    ["encrypt", "decrypt"]
  );
}

async function encryptToken(plainText: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return bytesToBase64(combined);
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

    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "No authorization code provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for token with Google
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI")!,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const { access_token, refresh_token, expires_in } =
      await tokenResponse.json();

    const encryptedToken = await encryptToken(access_token);

    // Upsert connection record
    const { error: upsertError } = await supabase
      .from("user_source_connections")
      .upsert(
        {
          user_id: user.id,
          source_type: "google_calendar",
          is_connected: true,
          oauth_token_encrypted: encryptedToken,
          oauth_token_expires_at: new Date(
            Date.now() + expires_in * 1000
          ).toISOString(),
          refresh_token,
          last_sync_time: null,
          auto_sync: true,
          sync_frequency_minutes: 60,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,source_type" }
      );

    if (upsertError) {
      throw new Error(`Database update failed: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Calendar connected successfully",
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
