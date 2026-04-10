import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface StructuredIntent {
  category: "fitness" | "work" | "growth" | "social" | "consumption" | "addiction" | "other";
  confidence: number;
  goal: string;
  first_action: string;
  reflection: string;
  suggested_stake: number;
}

interface UserBehaviorProfile {
  version?: string;
  stats?: {
    total_commitments?: number;
    completed_commitments?: number;
    missed_commitments?: number;
    active_commitments?: number;
    completion_rate?: number;
    active_overdue_count?: number;
    average_stake?: number;
  };
  categories?: Array<{
    category?: string;
    total?: number;
    completion_rate?: number;
  }>;
  psych?: {
    pattern_warning?: string;
    best_leverage_point?: string;
    identity_risk?: string;
    next_pressure_line?: string;
  };
}

interface PsychProfile {
  generatedAt?: string;
  pattern_warning?: string;
  best_leverage_point?: string;
  identity_risk?: string;
  next_pressure_line?: string;
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyBehaviorProfile(intent: StructuredIntent, behaviorProfile?: UserBehaviorProfile): StructuredIntent {
  if (!behaviorProfile) return intent;

  const completionRate = Number(behaviorProfile.stats?.completion_rate ?? 0);
  const overdueCount = Number(behaviorProfile.stats?.active_overdue_count ?? 0);

  let adjustedStake = intent.suggested_stake;
  if (completionRate > 0 && completionRate < 0.45) adjustedStake += 5;
  if (completionRate >= 0.75) adjustedStake -= 2;
  if (overdueCount > 0) adjustedStake += 3;

  const warning = behaviorProfile.psych?.pattern_warning;
  const nextLine = behaviorProfile.psych?.next_pressure_line;
  const psychAddon = [warning, nextLine].filter(Boolean)[0];

  return {
    ...intent,
    suggested_stake: clamp(5, adjustedStake, 100),
    reflection: psychAddon ? `${intent.reflection} ${psychAddon}`.slice(0, 220) : intent.reflection,
  };
}

async function analyzeWithOpenAI(
  raw_text: string,
  behaviorProfile?: UserBehaviorProfile,
  psychProfile?: PsychProfile
): Promise<StructuredIntent> {
  if (!OPENAI_API_KEY) {
    console.log("[analyze_intent] No OpenAI key, using fallback parsing");
    const baseIntent = applyBehaviorProfile(parseFallback(raw_text), behaviorProfile);
    if (!psychProfile) return baseIntent;
    const addon = psychProfile.next_pressure_line || psychProfile.pattern_warning;
    return addon ? { ...baseIntent, reflection: `${baseIntent.reflection} ${addon}`.slice(0, 220) } : baseIntent;
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
          ...(behaviorProfile
            ? [
                {
                  role: "user",
                  content:
                    "Behavior profile context (use this to personalize reflection, not to hallucinate facts): " +
                    JSON.stringify(behaviorProfile),
                },
              ]
            : []),
          ...(psychProfile
            ? [
                {
                  role: "user",
                  content:
                    "Psych profile context (pressure language only; do not invent details): " +
                    JSON.stringify(psychProfile),
                },
              ]
            : []),
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[analyze_intent] OpenAI error:", result);
      const baseIntent = applyBehaviorProfile(parseFallback(raw_text), behaviorProfile);
      if (!psychProfile) return baseIntent;
      const addon = psychProfile.next_pressure_line || psychProfile.pattern_warning;
      return addon ? { ...baseIntent, reflection: `${baseIntent.reflection} ${addon}`.slice(0, 220) } : baseIntent;
    }

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      const baseIntent = applyBehaviorProfile(parseFallback(raw_text), behaviorProfile);
      if (!psychProfile) return baseIntent;
      const addon = psychProfile.next_pressure_line || psychProfile.pattern_warning;
      return addon ? { ...baseIntent, reflection: `${baseIntent.reflection} ${addon}`.slice(0, 220) } : baseIntent;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const baseIntent = applyBehaviorProfile(parseFallback(raw_text), behaviorProfile);
      if (!psychProfile) return baseIntent;
      const addon = psychProfile.next_pressure_line || psychProfile.pattern_warning;
      return addon ? { ...baseIntent, reflection: `${baseIntent.reflection} ${addon}`.slice(0, 220) } : baseIntent;
    }

    const parsed = JSON.parse(jsonMatch[0]) as StructuredIntent;
    const normalizedIntent: StructuredIntent = {
      category: parsed.category || "other",
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      goal: (parsed.goal || raw_text).substring(0, 50),
      first_action: (parsed.first_action || "Start today").substring(0, 50),
      reflection: (parsed.reflection || "This is important to you").substring(0, 100),
      suggested_stake: Math.max(5, Math.min(100, parsed.suggested_stake || 20)),
    };

    const profiledIntent = applyBehaviorProfile(normalizedIntent, behaviorProfile);
    const addon = psychProfile?.next_pressure_line || psychProfile?.pattern_warning;
    return addon
      ? { ...profiledIntent, reflection: `${profiledIntent.reflection} ${addon}`.slice(0, 220) }
      : profiledIntent;
  } catch (error) {
    console.error("[analyze_intent] OpenAI error:", error);
    const baseIntent = applyBehaviorProfile(parseFallback(raw_text), behaviorProfile);
    if (!psychProfile) return baseIntent;
    const addon = psychProfile.next_pressure_line || psychProfile.pattern_warning;
    return addon ? { ...baseIntent, reflection: `${baseIntent.reflection} ${addon}`.slice(0, 220) } : baseIntent;
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    });
  }

  try {
    const { raw_text, behavior_profile, psych_profile } = await req.json();

    if (!raw_text || typeof raw_text !== "string" || raw_text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid intent text" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        }
      );
    }

    const intent = await analyzeWithOpenAI(
      raw_text.trim(),
      behavior_profile as UserBehaviorProfile | undefined,
      psych_profile as PsychProfile | undefined
    );

    return new Response(
      JSON.stringify(intent),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  } catch (error) {
    console.error("[analyze_intent] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze intent" }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }
});
