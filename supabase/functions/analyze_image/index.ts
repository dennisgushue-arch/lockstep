import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

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
    const { fileUrl, imageType = "photo" } = await req.json();

    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "fileUrl is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      imageType === "screenshot"
        ? "You are analyzing a screenshot. Extract: (1) all visible text, (2) the context/purpose of the screenshot, (3) any action items or important information. Return a JSON object: { description: string, extractedText: string, tags: string[], people: string[] }"
        : "You are analyzing a photo. Describe: (1) what is happening in the photo, (2) any people visible (describe without naming unless obvious), (3) location hints, (4) emotional context. Return a JSON object: { description: string, extractedText: string, tags: string[], people: string[] }";

    const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: fileUrl, detail: "low" } },
            ],
          },
        ],
        max_tokens: 512,
        response_format: { type: "json_object" },
      }),
    });

    const visionData = await visionResponse.json();
    const rawContent = visionData.choices?.[0]?.message?.content ?? "{}";
    const result = JSON.parse(rawContent);

    return new Response(
      JSON.stringify({
        description: result.description ?? "",
        extractedText: result.extractedText ?? "",
        tags: Array.isArray(result.tags) ? result.tags : [],
        people: Array.isArray(result.people) ? result.people : [],
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
