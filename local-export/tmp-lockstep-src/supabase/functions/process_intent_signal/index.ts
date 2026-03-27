import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Process Intent Signal - Server-side processing
 * Called when a new intent signal is captured from any source
 */

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface IntentSignal {
  user_id: string;
  source_type: "voice_note" | "message" | "calendar" | "journal" | "manual";
  source_id?: string;
  raw_text: string;
}

interface ProcessedSignal {
  signal_id: string;
  normalized_intent: string;
  category: string;
  confidence: number;
  pattern_id?: string;
  should_prompt: boolean;
  urgency: "low" | "medium" | "high";
}

// Normalize intent text (remove filler words)
function normalizeIntent(text: string): string {
  const lower = text.toLowerCase();
  const cleaned = lower
    .replace(/^(i|i'm|i've|i'd|i'll|i should|i need to|i want to|i have to|i must|i really)\s+/g, "")
    .replace(/\s+(really|definitely|probably|maybe|soon|eventually|sometime)\s+/g, " ")
    .trim();
  return cleaned;
}

// Categorize intent
function categorizeIntent(text: string): string {
  const lower = text.toLowerCase();
  
  if (/\b(workout|exercise|run|gym|fitness|health|weight|diet)\b/.test(lower)) return "fitness";
  if (/\b(work|business|project|startup|side hustle|career)\b/.test(lower)) return "work";
  if (/\b(learn|study|read|course|skill|practice)\b/.test(lower)) return "growth";
  if (/\b(family|kids|partner|friend|relationship|spend time)\b/.test(lower)) return "social";
  if (/\b(drink|smoke|screen|scroll|social media|phone)\b/.test(lower)) return "consumption";
  
  return "other";
}

// Calculate confidence score
function calculateConfidence(text: string): number {
  let score = 0.5;
  const lower = text.toLowerCase();
  
  if (/\b(must|have to|need to|should|committed to)\b/.test(lower)) score += 0.2;
  if (/\b(tomorrow|next week|this week|monday|today|soon)\b/.test(lower)) score += 0.15;
  if (/\b(start|begin|launch|finish|complete|do|make)\b/.test(lower)) score += 0.1;
  if (/\b(maybe|might|possibly|thinking about|considering)\b/.test(lower)) score -= 0.2;
  if (text.split(" ").length < 5) score -= 0.1;
  
  return Math.max(0, Math.min(1, score));
}

// Simple Jaccard similarity
function calculateSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isAnonAuth = !!SUPABASE_ANON_KEY && authHeader.trim() === `Bearer ${SUPABASE_ANON_KEY}`;
    const useUserAuth = authHeader && !isAnonAuth;
    const supabaseKey = useUserAuth ? SUPABASE_ANON_KEY : (SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY);

    if (!SUPABASE_URL || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      supabaseKey,
      useUserAuth ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    const { user_id, source_type, source_id, raw_text }: IntentSignal = await req.json();

    if (!user_id || !raw_text) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process signal
    const normalized = normalizeIntent(raw_text);
    const category = categorizeIntent(raw_text);
    const confidence = calculateConfidence(raw_text);

    // Skip low confidence
    if (confidence < 0.3) {
      return new Response(
        JSON.stringify({ 
          error: "Low confidence signal",
          confidence,
          message: "Signal not processed due to low confidence score"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const detectedAt = new Date().toISOString();

    const { data: signal, error: signalError } = await supabase
      .from("intent_signals")
      .insert({
        user_id,
        source_type,
        source_id: source_id ?? null,
        raw_text,
        detected_at: detectedAt,
        normalized_intent: normalized,
        category,
        confidence: confidence.toString(),
        processed: true,
      })
      .select()
      .single();

    if (signalError) {
      return new Response(
        JSON.stringify({ error: signalError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const signal_id = signal?.id ?? `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data: patterns, error: patternsError } = await supabase
      .from("intent_patterns")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "active");

    if (patternsError) {
      return new Response(
        JSON.stringify({ error: patternsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const activePatterns = patterns ?? [];
    let matchedPattern = null;
    
    for (const pattern of activePatterns) {
      const similarity = calculateSimilarity(normalized, pattern.normalized_intent);
      if (similarity > 0.7) {
        matchedPattern = pattern;
        break;
      }
    }

    let pattern_id: string | undefined;
    let should_prompt = false;
    let urgency: "low" | "medium" | "high" = "low";

    if (matchedPattern) {
      // Update existing pattern
      const previousCount = Number.parseInt(matchedPattern.occurrence_count ?? "0", 10) || 0;
      const newCount = previousCount + 1;
      const daySpan = Math.max(
        Math.floor((Date.now() - new Date(matchedPattern.first_detected_at).getTime()) / (1000 * 60 * 60 * 24)),
        1
      );
      
      pattern_id = matchedPattern.id;
      
      // Check thresholds
      if (newCount >= 5 && daySpan <= 7) {
        should_prompt = true;
        urgency = "high";
      } else if (newCount >= 4 && daySpan <= 14) {
        should_prompt = true;
        urgency = "medium";
      } else if (newCount >= 3 && daySpan <= 21) {
        should_prompt = true;
        urgency = "low";
      }

      const existingRelated = (() => {
        try {
          return JSON.parse(matchedPattern.related_signal_ids ?? "[]");
        } catch {
          return [];
        }
      })();

      const nextRelated = Array.from(new Set([...(existingRelated as string[]), signal_id]));
      const suggested_stake = Math.min(100, newCount * 5).toString();

      await supabase
        .from("intent_patterns")
        .update({
          last_detected_at: detectedAt,
          occurrence_count: newCount.toString(),
          day_span: daySpan.toString(),
          related_signal_ids: JSON.stringify(nextRelated),
          suggested_stake,
        })
        .eq("id", pattern_id);
    } else {
      const { data: newPattern, error: newPatternError } = await supabase
        .from("intent_patterns")
        .insert({
          user_id,
          normalized_intent: normalized,
          category,
          first_detected_at: detectedAt,
          last_detected_at: detectedAt,
          occurrence_count: "1",
          day_span: "1",
          status: "active",
          suggested_stake: "5",
          related_signal_ids: JSON.stringify([signal_id]),
        })
        .select()
        .single();

      if (newPatternError) {
        return new Response(
          JSON.stringify({ error: newPatternError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      pattern_id = newPattern?.id;
    }

    const result: ProcessedSignal = {
      signal_id,
      normalized_intent: normalized,
      category,
      confidence,
      pattern_id,
      should_prompt,
      urgency,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing signal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
