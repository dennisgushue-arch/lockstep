import { differenceInDays } from "date-fns";
import nlp from "compromise";
import { extractIntentWithOpenAI } from "./openai-intent";

/**
 * Passive Detection System
 * Analyzes intent signals and identifies patterns that warrant commitment prompts
 */

export interface IntentSignal {
  id: string;
  userId: string;
  sourceType: "voice_note" | "message" | "calendar" | "journal" | "manual";
  sourceId?: string;
  rawText: string;
  detectedAt: string;
  normalizedIntent?: string;
  category?: string;
  confidence?: number;
  processed: boolean;
}

export interface IntentPattern {
  id: string;
  userId: string;
  normalizedIntent: string;
  category: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  occurrenceCount: number;
  daySpan: number;
  status: "active" | "locked" | "dismissed";
  suggestedStake?: number;
  relatedSignalIds: string[];
}

export interface DetectionResult {
  shouldPrompt: boolean;
  pattern?: IntentPattern;
  message?: string;
  urgency: "low" | "medium" | "high";
}

/**
 * Normalize intent text to detect similar patterns
 * Uses OpenAI for advanced extraction, falls back to compromise NLP
 */
export async function normalizeIntent(text: string): Promise<string> {
  // Try OpenAI extraction first
  try {
    const ai = await extractIntentWithOpenAI(text);
    if (ai && ai.intent) {
      // Compose a normalized string with all extracted fields
      let norm = ai.intent;
      if (ai.action) norm += ` [action:${ai.action}]`;
      if (ai.object) norm += ` [object:${ai.object}]`;
      if (ai.time) norm += ` [time:${ai.time}]`;
      if (ai.frequency) norm += ` [frequency:${ai.frequency}]`;
      if (ai.people) norm += ` [people:${ai.people}]`;
      if (ai.context) norm += ` [context:${ai.context}]`;
      return norm.trim();
    }
  } catch (e) {
    // Fallback to local logic
  }

  // ...existing compromise-based normalization logic...
  const lower = text.toLowerCase();
  const doc = nlp(lower);
  const verbs = doc.verbs().out("array");
  const nouns = doc.nouns().out("array");
  let cleaned = "";
  if (verbs.length && nouns.length) {
    cleaned = `${verbs[0]} ${nouns[0]}`;
  } else {
    cleaned = lower;
  }

  // Remove filler words and commitment language
  cleaned = cleaned
    .replace(/^(i|i'm|i've|i'd|i'll|i should|i need to|i want to|i have to|i must|i really|i gotta|gotta|gonna|i'm gonna)\s+/gi, "")
    .replace(/\s+(really|definitely|probably|maybe|soon|eventually|sometime|finally|actually)\s+/g, " ")
    .replace(/\s+(again|more|less)\s+/g, " ")
    .trim();

  // Synonym expansion (fuzzy matching, expanded)
  cleaned = cleaned
    .replace(/\b(workout|work out|exercise|train|fitness|gym|conditioning|cardio|strength)\b/g, "exercise")
    .replace(/\b(run|jog|sprint|marathon|race|track)\b/g, "run")
    .replace(/\b(learn|study|practice|read|course|tutorial|training|lesson|class|school|university|college)\b/g, "learn")
    .replace(/\b(quit|stop|give up|drop|abandon|cease|halt|end|discontinue)\b/g, "quit")
    .replace(/\b(drink|alcohol|beer|wine|liquor|cocktail|booze)\b/g, "drink")
    .replace(/\b(smoke|vape|cigarette|nicotine|cigar|hookah)\b/g, "smoke")
    .replace(/\b(meditate|mindfulness|breathe|breathing|relax|calm)\b/g, "meditate")
    .replace(/\b(write|blog|journal|note|essay|article|story|novel)\b/g, "write")
    .replace(/\b(read|book|novel|magazine|article|paper|literature)\b/g, "read")
    .replace(/\b(eat|meal|diet|nutrition|food|snack|breakfast|lunch|dinner)\b/g, "eat")
    .replace(/\b(clean|tidy|organize|declutter|sort|arrange)\b/g, "clean")
    .replace(/\b(call|phone|ring|dial|facetime|zoom|skype)\b/g, "call")
    .replace(/\b(visit|see|meet|hang out|catch up|gather)\b/g, "visit")
    .replace(/\b(save|budget|invest|spend|money|finance|pay|buy|purchase)\b/g, "finance");

  // Extract core action + object patterns (fallback)
  if (!verbs.length || !nouns.length) {
    const actionMatch = cleaned.match(/(start|begin|stop|quit|call|text|meet|visit|work on|finish|complete|launch|build|write|read|exercise|run|work out|meditate|practice|learn|study|clean|eat|finance)\s+(.+)/);
    if (actionMatch) {
      const [, action, object] = actionMatch;
      cleaned = `${action} ${object}`.replace(/\s+/g, " ").trim();
    }
  }

  // Extract context: time, frequency, people
  const timeMatch = lower.match(/(every day|daily|weekly|monthly|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|evening|night|afternoon|before work|after work|at lunch|at night|at noon|at midnight)/);
  if (timeMatch) {
    cleaned += ` @${timeMatch[0]}`;
  }
  const freqMatch = lower.match(/(once a week|twice a week|three times a week|every other day|every weekend|every morning|every night)/);
  if (freqMatch) {
    cleaned += ` #${freqMatch[0]}`;
  }
  const peopleMatch = lower.match(/(with (my|the|a|an)? ?(friend|partner|coach|group|team|family|kids|spouse|colleague|boss|manager|mentor|therapist|doctor|trainer))/);
  if (peopleMatch) {
    cleaned += ` +${peopleMatch[0]}`;
  }

  return cleaned;
}

/**
 * Extract semantic intent category
 */
export function categorizeIntent(text: string): string {
  const lower = text.toLowerCase();

  // Health & Fitness
  if (/\b(workout|exercise|run|gym|fitness|health|weight|diet|yoga|meditate|sleep|walk|jog|train|lift)\b/.test(lower)) {
    return "fitness";
  }

  // Work & Career
  if (/\b(work|business|project|startup|side hustle|career|job|portfolio|resume|linkedin|networking|pitch|launch|build)\b/.test(lower)) {
    return "work";
  }

  // Learning & Growth
  if (/\b(learn|study|read|course|skill|practice|book|tutorial|training|certification|language|coding|program)\b/.test(lower)) {
    return "growth";
  }

  // Relationships & Social
  if (/\b(family|kids|parent|partner|spouse|friend|relationship|spend time|call|visit|date|hang out|catch up)\b/.test(lower)) {
    return "social";
  }

  // Bad Habits to Break
  if (/\b(drink|drunk|smoking|smoke|vaping|vape|quit|stop|screen|scroll|social media|phone|procrastinat|waste time)\b/.test(lower)) {
    return "habits";
  }

  // Creativity & Hobbies
  if (/\b(write|paint|draw|music|instrument|create|art|hobby|photo|blog|video|podcast)\b/.test(lower)) {
    return "creative";
  }

  // Finance & Admin
  if (/\b(money|budget|save|invest|taxes|insurance|bills|debt|bank|financial|expense)\b/.test(lower)) {
    return "finance";
  }

  return "other";
}

/**
 * Calculate confidence that text represents a genuine intent
 * Returns 0-1 score
 */
export function calculateIntentConfidence(text: string): number {
  let score = 0.4; // Start slightly skeptical

  const lower = text.toLowerCase();
  const length = text.length;

  // Too short = likely not a real intent
  if (length < 15) score -= 0.2;
  if (length > 30) score += 0.1;

  // Strong commitment language
  if (/\b(must|have to|need to|should|committed to|promise|swear|determined)\b/.test(lower)) score += 0.25;
  if (/\b(really need|seriously need|definitely need|absolutely must)\b/.test(lower)) score += 0.15;

  // Temporal signals (time-bound intents are stronger)
  if (/\b(tomorrow|next week|this week|monday|tuesday|wednesday|thursday|friday|today|tonight)\b/.test(lower)) score += 0.2;
  if (/\b(soon|eventually|sometime|one day)\b/.test(lower)) score += 0.05; // Vague time = weaker

  // Action verbs (concrete actions are stronger)
  if (/\b(start|begin|launch|finish|complete|quit|stop|call|text|meet|book|schedule|sign up)\b/.test(lower)) score += 0.15;

  // Repetition signals ("again", "more", "keep saying")
  if (/\b(again|keep saying|always say|keep talking about|mentioned before)\b/.test(lower)) score += 0.1;

  // Penalize for uncertainty
  if (/\b(maybe|might|possibly|thinking about|considering)\b/.test(lower)) score -= 0.2;

  // Penalize for very short text
  if (text.split(" ").length < 5) score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

/**
 * Find or create a pattern for a new signal
 */
export async function matchSignalToPattern(
  signal: IntentSignal,
  existingPatterns: IntentPattern[]
): Promise<IntentPattern | null> {
  const normalized = signal.normalizedIntent || await normalizeIntent(signal.rawText);

  for (const pattern of existingPatterns) {
    const similarity = calculateSimilarity(normalized, pattern.normalizedIntent);
    if (similarity > 0.7 && pattern.status === "active") {
      return pattern;
    }
  }
  return null;
}

/**
 * Simple string similarity (Jaccard coefficient)
 */
function calculateSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));

  const intersection = new Set(Array.from(setA).filter((x) => setB.has(x)));
  const union = new Set([...Array.from(setA), ...Array.from(setB)]);

  return intersection.size / union.size;
}

/**
 * Update or create pattern with new signal
 */
export async function updatePattern(
  signal: IntentSignal,
  existingPattern?: IntentPattern
): Promise<IntentPattern> {
  const normalized = signal.normalizedIntent || await normalizeIntent(signal.rawText);
  const category = signal.category || categorizeIntent(signal.rawText);

  if (existingPattern) {
    const relatedIds = [...existingPattern.relatedSignalIds, signal.id];
    const daySpan = differenceInDays(
      new Date(signal.detectedAt),
      new Date(existingPattern.firstDetectedAt)
    );
    return {
      ...existingPattern,
      lastDetectedAt: signal.detectedAt,
      occurrenceCount: existingPattern.occurrenceCount + 1,
      daySpan: Math.max(daySpan, 1),
      relatedSignalIds: relatedIds,
      suggestedStake: calculateSuggestedStake(
        existingPattern.occurrenceCount + 1,
        daySpan
      ),
    };
  } else {
    return {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: signal.userId,
      normalizedIntent: normalized,
      category,
      firstDetectedAt: signal.detectedAt,
      lastDetectedAt: signal.detectedAt,
      occurrenceCount: 1,
      daySpan: 1,
      status: "active",
      relatedSignalIds: [signal.id],
    };
  }
}

/**
 * Calculate suggested stake based on pattern frequency and timespan
 */
function calculateSuggestedStake(occurrences: number, days: number): number {
  // More occurrences in shorter time = higher stakes
  const density = occurrences / Math.max(days, 1);

  if (density > 1) return 20; // Multiple times per day
  if (density > 0.5) return 15; // Every other day
  if (density > 0.3) return 10; // Few times a week
  return 5; // Baseline
}

/**
 * Determine if pattern should trigger a commitment prompt
 */
export function shouldPromptCommitment(pattern: IntentPattern): DetectionResult {
  // Already locked in or dismissed
  if (pattern.status !== "active") {
    return {
      shouldPrompt: false,
      urgency: "low",
    };
  }

  // Thresholds for prompting
  const { occurrenceCount, daySpan } = pattern;

  // High urgency: 5+ mentions in under 7 days
  if (occurrenceCount >= 5 && daySpan <= 7) {
    return {
      shouldPrompt: true,
      pattern,
      message: `You've mentioned "${pattern.normalizedIntent}" ${occurrenceCount} times in ${daySpan} days. Ready to lock this in?`,
      urgency: "high",
    };
  }

  // Medium urgency: 4+ mentions in under 14 days
  if (occurrenceCount >= 4 && daySpan <= 14) {
    return {
      shouldPrompt: true,
      pattern,
      message: `You've mentioned "${pattern.normalizedIntent}" ${occurrenceCount} times. Time to commit?`,
      urgency: "medium",
    };
  }

  // Low urgency: 3+ mentions in under 21 days
  if (occurrenceCount >= 3 && daySpan <= 21) {
    return {
      shouldPrompt: true,
      pattern,
      message: `You've mentioned "${pattern.normalizedIntent}" ${occurrenceCount} times over ${daySpan} days. Want to make it real?`,
      urgency: "low",
    };
  }

  return {
    shouldPrompt: false,
    urgency: "low",
  };
}

/**
 * Process a new signal through the detection pipeline
 */
export async function processNewSignal(
  signal: IntentSignal,
  existingPatterns: IntentPattern[]
): Promise<{
  updatedPattern: IntentPattern;
  detectionResult: DetectionResult;
}> {
  signal.normalizedIntent = await normalizeIntent(signal.rawText);
  signal.category = categorizeIntent(signal.rawText);
  signal.confidence = calculateIntentConfidence(signal.rawText);

  if (signal.confidence < 0.15) {
    throw new Error("Low confidence signal, not processing");
  }

  // Fuzzy pattern matching: allow partial matches and synonyms
  // Expand action and object extraction
  // (No longer needed here, handled in normalizeIntent)

  // Find or create pattern
  let pattern = await matchSignalToPattern(signal, existingPatterns);
  pattern = await updatePattern(signal, pattern || undefined);
  const detectionResult = shouldPromptCommitment(pattern);
  return { updatedPattern: pattern, detectionResult };
}
