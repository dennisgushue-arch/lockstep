import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExtractedIntent {
  intent: string;
  emotion: string;
  obstacles: string;
  suggestedStake: string;
  deadline: string;
  confidenceScore: number;
}

const EXTRACTION_PROMPT = `You are an AI that extracts commitment intentions from voice note transcriptions.

Given a voice note transcription, extract:
1. **intent**: The core commitment in 1-2 sentences. Rewrite it as a formal pact.
2. **emotion**: The emotional tone (e.g., "determined", "anxious", "excited")
3. **obstacles**: The main obstacles mentioned or implied
4. **suggestedStake**: A recommended stake amount (in credits, 1-10) based on difficulty
5. **deadline**: Suggested deadline (e.g., "7 days", "2 weeks", "30 days")
6. **confidenceScore**: Your confidence (0-100) that you correctly understood the intent

Return ONLY valid JSON, no markdown:
{
  "intent": "...",
  "emotion": "...",
  "obstacles": "...",
  "suggestedStake": "...",
  "deadline": "...",
  "confidenceScore": 85
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
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

    const { voiceNoteId } = await req.json();

    if (!voiceNoteId) {
      return new Response(
        JSON.stringify({ error: "No voiceNoteId provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch voice note
    const { data: voiceNote, error: fetchError } = await supabase
      .from("voice_notes")
      .select("*")
      .eq("id", voiceNoteId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !voiceNote) {
      return new Response(
        JSON.stringify({ error: "Voice note not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!voiceNote.transcription) {
      return new Response(
        JSON.stringify({ error: "Voice note not yet transcribed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Claude to extract intent
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\nVoice Note Transcription:\n${voiceNote.transcription}`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const claudeData = await claudeResponse.json();
    let extractedIntent: ExtractedIntent;

    try {
      const content = claudeData.content[0].text;
      // Extract JSON from response (in case Claude wraps it in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      extractedIntent = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error(`Failed to parse Claude response: ${parseError}`);
    }

    // Update voice note with extracted intent
    const { error: updateError } = await supabase
      .from("voice_notes")
      .update({
        extracted_intent: extractedIntent.intent,
        emotion: extractedIntent.emotion,
        obstacles: extractedIntent.obstacles,
        suggested_stake: parseInt(extractedIntent.suggestedStake),
        confidence_score: extractedIntent.confidenceScore,
        extracted_at: new Date().toISOString(),
      })
      .eq("id", voiceNoteId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        extractedIntent,
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
