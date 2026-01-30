import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface StructuredIntent {
  category: "fitness" | "work" | "growth" | "social" | "consumption" | "addiction" | "other";
  confidence: number;
  goal: string;
  first_action: string;
  reflection: string;
  suggested_stake: number;
}

async function analyzeWithOpenAI(raw_text: string): Promise<StructuredIntent> {
  if (!OPENAI_API_KEY) {
    console.log("[analyze_intent] No OpenAI key, using fallback parsing");
    return parseFallback(raw_text);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an intent analyzer. Parse the user's statement and extract their goal. 
Return a JSON object with:
- category: "fitness", "work", "growth", "social", "consumption", "addiction", or "other"
- confidence: number 0-1 (how clear is the intent)
- goal: the primary goal (max 50 chars)
- first_action: the first concrete step to take (max 50 chars)
- reflection: why this goal matters to them (max 100 chars)
- suggested_stake: dollar amount $5-$100 based on importance`,
          },
          {
            role: "user",
            content: raw_text,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[analyze_intent] OpenAI error:", result);
      return parseFallback(raw_text);
    }

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return parseFallback(raw_text);
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return parseFallback(raw_text);
    }

    const parsed = JSON.parse(jsonMatch[0]) as StructuredIntent;
    return {
      category: parsed.category || "other",
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      goal: (parsed.goal || raw_text).substring(0, 50),
      first_action: (parsed.first_action || "Start today").substring(0, 50),
      reflection: (parsed.reflection || "This is important to you").substring(0, 100),
      suggested_stake: Math.max(5, Math.min(100, parsed.suggested_stake || 20)),
    };
  } catch (error) {
    console.error("[analyze_intent] OpenAI error:", error);
    return parseFallback(raw_text);
  }
}

function parseFallback(raw_text: string): StructuredIntent {
  const lower = raw_text.toLowerCase();

  let category: StructuredIntent["category"] = "other";
  if (/\b(workout|exercise|run|gym|fitness|health|diet)\b/.test(lower)) category = "fitness";
  else if (/\b(work|business|project|career|launch|build)\b/.test(lower)) category = "work";
  else if (/\b(learn|study|read|course|skill|practice)\b/.test(lower)) category = "growth";
  else if (/\b(family|kids|friend|relationship|call|visit)\b/.test(lower)) category = "social";
  else if (/\b(drink|smoke|screen|scroll|social media|phone)\b/.test(lower)) category = "consumption";

  const confidence = /\b(must|have to|need|should|committed)\b/.test(lower) ? 0.8 : 0.6;

  return {
    category,
    confidence,
    goal: raw_text.substring(0, 50),
    first_action: "Start today",
    reflection: "This goal matters to you",
    suggested_stake: 20,
  };
}

Deno.serve(async (req) => {
  try {
    const { raw_text } = await req.json();

    if (!raw_text || typeof raw_text !== "string" || raw_text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid intent text" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const intent = await analyzeWithOpenAI(raw_text.trim());

    return new Response(
      JSON.stringify(intent),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[analyze_intent] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze intent" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
