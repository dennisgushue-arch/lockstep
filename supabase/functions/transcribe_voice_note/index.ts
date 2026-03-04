import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header and extract user
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

    // Parse form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const duration = parseInt(formData.get("duration") as string);

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload audio to Supabase Storage
    const fileName = `voice-notes/${user.id}/${Date.now()}.webm`;
    const audioBuffer = await audioFile.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio_files")
      .upload(fileName, audioBuffer, {
        contentType: "audio/webm",
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Call Whisper API for transcription
    const whisperFormData = new FormData();
    whisperFormData.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "audio.webm");
    whisperFormData.append("model", "whisper-1");

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      throw new Error(`Whisper API error: ${error}`);
    }

    const { text: transcription } = await whisperResponse.json();

    // Create voice note record in database
    const { data: voiceNote, error: dbError } = await supabase
      .from("voice_notes")
      .insert({
        user_id: user.id,
        audio_path: fileName,
        transcription,
        duration,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Trigger intent extraction in background
    // (Will be handled by separate function or worker)
    console.log(`Voice note created: ${voiceNote.id}, triggering extraction`);

    return new Response(
      JSON.stringify({
        success: true,
        voiceNoteId: voiceNote.id,
        transcription,
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
