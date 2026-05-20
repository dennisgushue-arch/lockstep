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
    const { query, userId, topK = 8 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Embed the query
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding: number[] = embeddingData.data?.[0]?.embedding ?? [];

    // 2. Vector similarity search via pgvector RPC
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: matches, error } = await admin.rpc("match_echo_memories", {
      query_embedding: queryEmbedding,
      user_id_filter: userId,
      match_count: topK,
    });

    if (error) throw error;

    const sources = matches ?? [];

    // 3. Synthesize answer via GPT
    const memoriesContext = sources
      .map(
        (m: any, i: number) =>
          `[${i + 1}] (${m.source_type}, ${m.created_at}): ${m.content}`
      )
      .join("\n\n");

    const synthesisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
              "You are ECHO, a personal memory recovery AI. Given a user's question and their relevant memories, synthesize a concise, natural answer in 1-3 sentences. Cite specific details from the memories. Speak in second person ('you'). Be warm but precise. If no memories are relevant, say so gently.",
          },
          {
            role: "user",
            content: `Question: ${query}\n\nRelevant memories:\n${memoriesContext || "(none found)"}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 256,
      }),
    });

    const synthesisData = await synthesisResponse.json();
    const answer = synthesisData.choices?.[0]?.message?.content ?? "I couldn't find matching memories.";

    return new Response(
      JSON.stringify({ answer, sources }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
