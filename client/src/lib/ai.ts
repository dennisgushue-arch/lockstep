import { supabase } from "./supabase";
import type { UserBehaviorProfile } from "./behavior-profile";
import type { PsychProfile } from "./psych-engine";

export type IntentCategory = "fitness" | "work" | "growth" | "social" | "consumption" | "addiction" | "other";

export interface StructuredIntent {
  category: IntentCategory;
  confidence: number;
  goal: string;
  first_action: string;
  reflection: string;
  suggested_stake: number;
  action?: string;
  stake?: number;
  deadline?: string;
  proof_method?: string;
  reflection_message?: string;
  stake_reason?: string | null;
  deadline_reason?: string | null;
  pact_size_reason?: string | null;
  pact_size_level?: string | null;
  proof_reason?: string | null;
  proof_confidence?: "low" | "medium" | "high" | null;
  ai_plan?: any;
  parsed_intent?: {
    category?: string;
    difficulty?: 1 | 2 | 3 | 4 | 5;
    proof_method?: string;
  };
  recommendation?: {
    suggested_first_step?: string;
  };
  risk?: {
    at_risk_warning?: string;
  };
}

type AnalyzeIntentOptions = {
  behaviorProfile?: UserBehaviorProfile | null;
  psychProfile?: PsychProfile | null;
};

function buildLocalFallbackIntent(rawText: string): StructuredIntent {
  const lowerText = rawText.toLowerCase();

  let category: IntentCategory = "other";
  if (lowerText.includes("run") || lowerText.includes("gym") || lowerText.includes("workout") || lowerText.includes("exercise")) {
    category = "fitness";
  } else if (lowerText.includes("write") || lowerText.includes("code") || lowerText.includes("work") || lowerText.includes("project")) {
    category = "work";
  } else if (lowerText.includes("money") || lowerText.includes("save") || lowerText.includes("budget")) {
    category = "growth";
  } else if (lowerText.includes("eat") || lowerText.includes("diet") || lowerText.includes("food")) {
    category = "consumption";
  } else if (lowerText.includes("quit") || lowerText.includes("stop") || lowerText.includes("habit")) {
    category = "addiction";
  }

  return {
    category,
    confidence: 0.65,
    goal: rawText,
    first_action: "Take the smallest concrete step right now.",
    reflection: "Quick plan generated. Don't wait for perfect analysis — lock a small pact and move.",
    suggested_stake: 10,
    action: rawText,
    stake: 10,
    proof_method: "checkin",
    reflection_message: "Quick plan generated. Keep momentum: start small and prove one action.",
    stake_reason: "Quick-plan stake tuned for fast action.",
    deadline_reason: "Use a near-term deadline to keep pressure clear.",
    pact_size_reason: "Fallback mode uses small, winnable tasks.",
    pact_size_level: "small",
    proof_reason: "Low-friction fallback proof keeps flow moving.",
    proof_confidence: "low",
  };
}

export async function analyzeIntent(raw_text: string, options?: AnalyzeIntentOptions): Promise<StructuredIntent> {
  console.log("[AI] Analyzing intent:", raw_text);
  const behaviorProfile = options?.behaviorProfile ?? null;
  const psychProfile = options?.psychProfile ?? null;
  
  try {
    const { data, error } = await supabase.functions.invoke("analyze_intent", {
      body: {
        raw_text,
        behavior_profile: behaviorProfile,
        psych_profile: psychProfile
      },
    });

    console.log("[AI] Raw response:", JSON.stringify({ data, error }, null, 2));

    if (error) {
      console.error("[AI] Error from Supabase function:", JSON.stringify(error, null, 2));
      
      // Fallback: try direct fetch if Supabase client fails
      console.log("[AI] Attempting direct fetch fallback...");
      try {
        const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseUrl = rawSupabaseUrl
          ? rawSupabaseUrl.replace(".supabase.com", ".supabase.co")
          : rawSupabaseUrl;
        const response = await fetch(`${supabaseUrl}/functions/v1/analyze_intent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw_text,
            behavior_profile: behaviorProfile,
            psych_profile: psychProfile,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const fallbackData = await response.json();
        console.log("[AI] Fallback fetch succeeded:", fallbackData);
        
        const intent = fallbackData as StructuredIntent;
        if (!intent.category || !intent.reflection) {
          throw new Error("Invalid response structure from fallback");
        }
        return intent;
      } catch (fallbackError) {
        console.error("[AI] Fallback fetch also failed:", fallbackError);
        console.warn("[AI] Using local fallback intent due to edge function outage");
        return buildLocalFallbackIntent(raw_text);
      }
    }

    if (!data) {
      console.error("[AI] No data returned from analyze_intent");
      throw new Error("No data returned from analyze_intent");
    }

    let normalizedData: unknown = data;
    if (typeof data === "string") {
      try {
        normalizedData = JSON.parse(data);
      } catch (parseError) {
        console.error("[AI] Failed to parse string response:", data);
        throw new Error("Invalid JSON response from analyze_intent");
      }
    }

    const intent = ((normalizedData as { data?: StructuredIntent })?.data ?? normalizedData) as StructuredIntent;
    console.log("[AI] Intent object:", JSON.stringify(intent, null, 2));
    
    if (!intent.category) {
      console.error("[AI] Missing category in response:", intent);
      throw new Error(`Missing category in response: ${JSON.stringify(intent)}`);
    }
    if (!intent.reflection) {
      console.error("[AI] Missing reflection in response:", intent);
      throw new Error(`Missing reflection in response: ${JSON.stringify(intent)}`);
    }

    console.log("[AI] Parsed intent successfully:", intent);
    return intent;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[AI] Full error caught:", errorMessage);
    throw err;
  }
}

export interface IntentAnalysis {
  category: "fitness" | "work" | "growth" | "social" | "other";
  confrontation: string;
  suggestedStake: number;
}

export const analyzeIntentText = async (text: string): Promise<IntentAnalysis> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const lowerText = text.toLowerCase();
  
  // Basic heuristic analysis for the mockup
  if (lowerText.includes("run") || lowerText.includes("gym") || lowerText.includes("workout")) {
    return {
      category: "fitness",
      confrontation: "You've said you'd exercise before. What makes this time different? The couch is comfortable, and your excuses are well-rehearsed.",
      suggestedStake: 10,
    };
  }

  if (lowerText.includes("write") || lowerText.includes("code") || lowerText.includes("work")) {
    return {
      category: "work",
      confrontation: "Distraction is your natural state. You'll find a way to procrastinate unless you feel the heat of a real consequence.",
      suggestedStake: 20,
    };
  }

  // Default confrontational response
  return {
    category: "other",
    confrontation: "That sounds like another thing you keep saying you'll do. Lock it in with a real stake or drop it.",
    suggestedStake: 5,
  };
};
