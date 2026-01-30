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
  
  // Remove filler words
  const cleaned = lower
    .replace(/^(i|i'm|i've|i'd|i'll|i should|i need to|i want to|i have to|i must|i really)\s+/g, "")
    .replace(/\s+(really|definitely|probably|maybe|soon|eventually|sometime)\s+/g, " ")
    .trim();
  
  return cleaned;
}

/**
 * Extract semantic intent category
 */
export function categorizeIntent(text: string): string {
  const lower = text.toLowerCase();
  
  if (/\b(workout|exercise|run|gym|fitness|health|weight|diet)\b/.test(lower)) {
    return "fitness";
  }
  if (/\b(work|business|project|startup|side hustle|career)\b/.test(lower)) {
    return "work";
  }
  if (/\b(learn|study|read|course|skill|practice)\b/.test(lower)) {
    return "growth";
  }
  if (/\b(family|kids|partner|friend|relationship|spend time)\b/.test(lower)) {
    return "social";
  }
  if (/\b(drink|smoke|screen|scroll|social media|phone)\b/.test(lower)) {
    return "consumption";
  }
  
  return "other";
}

/**
 * Calculate confidence that text represents a genuine intent
 * Returns 0-1 score
 */
export function calculateIntentConfidence(text: string): number {
  let score = 0.5; // Start neutral
  
  const lower = text.toLowerCase();
  
  // Boost for commitment language
  if (/\b(must|have to|need to|should|committed to)\b/.test(lower)) score += 0.2;
  
  // Boost for temporal signals
  if (/\b(tomorrow|next week|this week|monday|today|soon)\b/.test(lower)) score += 0.15;
  
  // Boost for action verbs
  if (/\b(start|begin|launch|finish|complete|do|make)\b/.test(lower)) score += 0.1;
  
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
