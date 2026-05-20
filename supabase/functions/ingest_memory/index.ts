import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { content, sourceType, rawFileUrl, userId } = await req.json();

    if (!content || !sourceType) {
      return new Response(JSON.stringify({ error: "content and sourceType are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Extract tags, people and emotional weight via GPT
    const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a memory analysis AI. Given a text memory, extract: (1) relevant tags as an array of strings, (2) people mentioned by first name as an array, (3) emotional weight as 'low', 'medium', or 'high'. Respond with a JSON object only: { tags: string[], people: string[], emotionalWeight: 'low' | 'medium' | 'high' }",
          },
          { role: "user", content },
        ],
        temperature: 0.2,
        max_tokens: 256,
        response_format: { type: "json_object" },
      }),
    });

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.choices?.[0]?.message?.content ?? "{}";
    const analysis = JSON.parse(analysisText);

    const tags: string[] = Array.isArray(analysis.tags) ? analysis.tags : [];
    const people: string[] = Array.isArray(analysis.people) ? analysis.people : [];
    const emotionalWeight: string = ["low", "medium", "high"].includes(analysis.emotionalWeight)
      ? analysis.emotionalWeight
      : "medium";

    // 2. Generate embedding for semantic search
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: content,
      }),
    });

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data?.[0]?.embedding ?? null;

    // 3. Persist to database
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: memoryRow, error } = await admin
      .from("echo_memories")
      .insert({
        user_id: userId,
        content,
        source_type: sourceType,
        raw_file_url: rawFileUrl ?? null,
        tags: JSON.stringify(tags),
        people: JSON.stringify(people),
        emotional_weight: emotionalWeight,
        embedding: embedding ? JSON.stringify(embedding) : null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, id: memoryRow.id, tags, people, emotionalWeight }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
