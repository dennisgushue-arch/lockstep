import { differenceInDays } from "date-fns";

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
 * e.g., "I need to start working out" → "start working out"
 */
export function normalizeIntent(text: string): string {
  const lower = text.toLowerCase();
  
  // Remove filler words and commitment language
  let cleaned = lower
    .replace(/^(i|i'm|i've|i'd|i'll|i should|i need to|i want to|i have to|i must|i really|i gotta|gotta|gonna|i'm gonna)\s+/gi, "")
    .replace(/\s+(really|definitely|probably|maybe|soon|eventually|sometime|finally|actually)\s+/g, " ")
    .replace(/\s+(again|more|less)\s+/g, " ")
    .trim();
  
  // Extract core action + object patterns
  // "start going to the gym" → "go gym"
  // "need to call mom" → "call mom"
  const actionMatch = cleaned.match(/(start|begin|stop|quit|call|text|meet|visit|work on|finish|complete|launch|build|write|read|exercise|run|work out|meditate|practice|learn|study)\s+(.+)/);
  if (actionMatch) {
    const [, action, object] = actionMatch;
    cleaned = `${action} ${object}`.replace(/\s+/g, " ").trim();
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
export function matchSignalToPattern(
  signal: IntentSignal,
  existingPatterns: IntentPattern[]
): IntentPattern | null {
  const normalized = signal.normalizedIntent || normalizeIntent(signal.rawText);
  
  // Find similar patterns (simple string matching for now)
  // In production, you'd use embedding similarity or fuzzy matching
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
  
  const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
  const union = new Set([...Array.from(setA), ...Array.from(setB)]);
  
  return intersection.size / union.size;
}

/**
 * Update or create pattern with new signal
 */
export function updatePattern(
  signal: IntentSignal,
  existingPattern?: IntentPattern
): IntentPattern {
  const normalized = signal.normalizedIntent || normalizeIntent(signal.rawText);
  const category = signal.category || categorizeIntent(signal.rawText);
  
  if (existingPattern) {
    // Update existing pattern
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
    // Create new pattern
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
export function processNewSignal(
  signal: IntentSignal,
  existingPatterns: IntentPattern[]
): {
  updatedPattern: IntentPattern;
  detectionResult: DetectionResult;
} {
  // Normalize and categorize
  signal.normalizedIntent = normalizeIntent(signal.rawText);
  signal.category = categorizeIntent(signal.rawText);
  signal.confidence = calculateIntentConfidence(signal.rawText);
  
  // Skip low confidence signals
  if (signal.confidence < 0.3) {
    throw new Error("Low confidence signal, not processing");
  }
  
  // Find or create pattern
  const matchedPattern = matchSignalToPattern(signal, existingPatterns);
  const updatedPattern = updatePattern(signal, matchedPattern || undefined);
  
  // Check if should prompt
  const detectionResult = shouldPromptCommitment(updatedPattern);
  
  return { updatedPattern, detectionResult };
}
