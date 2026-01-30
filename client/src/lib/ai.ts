import { supabase } from "./supabase";

export type IntentCategory = "fitness" | "work" | "growth" | "social" | "consumption" | "addiction" | "other";

export interface StructuredIntent {
  category: IntentCategory;
  confidence: number;
  goal: string;
  first_action: string;
  reflection: string;
  suggested_stake: number;
}

export async function analyzeIntent(raw_text: string): Promise<StructuredIntent> {
  console.log("[AI] Analyzing intent:", raw_text);
  
  try {
    const { data, error } = await supabase.functions.invoke("analyze_intent", {
      body: { raw_text },
    });

    console.log("[AI] Raw response:", JSON.stringify({ data, error }, null, 2));

    if (error) {
      console.error("[AI] Error from Supabase function:", JSON.stringify(error, null, 2));
      throw new Error(`Supabase error: ${JSON.stringify(error)}`);
    }

    if (!data) {
      console.error("[AI] No data returned from analyze_intent");
      throw new Error("No data returned from analyze_intent");
    }

    // Validate the response has required fields
    const intent = data as StructuredIntent;
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
    confrontation: "That sounds like another vague promise you'll break by lunch. Prove me wrong or keep lying to yourself.",
    suggestedStake: 5,
  };
};
