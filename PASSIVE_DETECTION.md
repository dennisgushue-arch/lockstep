# Passive Detection System Documentation

## Overview

The Passive Detection System is Lockstep's core innovation - it automatically converts repeated intentions into pre-commitments using pattern recognition and loss aversion psychology.

## How It Works

### 1. Signal Collection
The system captures "intent signals" from multiple sources:
- **Voice Notes**: Real-time transcription of spoken intents
- **Messages**: SMS, WhatsApp, iMessage parsing for intent keywords
- **Calendar**: Pattern detection in repeated/deleted calendar events
- **Journal**: NLP extraction from journal entries
- **Manual**: Direct capture via the app

### 2. Pattern Detection
Each signal is:
- **Normalized**: Stripped of filler words ("I should", "I want to", etc.)
- **Categorized**: Fitness, work, growth, social, consumption, other
- **Confidence Scored**: 0-1 score based on commitment language
- **Matched**: Compared against existing patterns using similarity algorithms

### 3. Triggering Commitments
Patterns trigger prompts when they hit thresholds:
- **High urgency**: 5+ mentions in ≤7 days
- **Medium urgency**: 4+ mentions in ≤14 days
- **Low urgency**: 3+ mentions in ≤21 days

The system then presents an irreversible question: **"Do you want to lock this in?"**

## Architecture

### Database Schema (`shared/schema.ts`)
```typescript
// Raw intent signals from all sources
intentSignals {
  id, userId, sourceType, rawText, 
  detectedAt, normalizedIntent, category, 
  confidence, processed
}

// Detected patterns across signals
intentPatterns {
  id, userId, normalizedIntent, category,
  firstDetectedAt, lastDetectedAt,
  occurrenceCount, daySpan, status,
  suggestedStake, relatedSignalIds
}

// Connected input sources
inputSources {
  id, userId, sourceType, connected,
  authToken, lastSyncAt, settings
}
```

### Core Algorithm (`client/src/lib/passive-detection.ts`)

**Key Functions:**
- `normalizeIntent()`: Removes filler words and standardizes phrasing
- `categorizeIntent()`: Uses keyword matching to classify intent
- `calculateIntentConfidence()`: Scores likelihood of genuine intent
- `matchSignalToPattern()`: Finds similar existing patterns
- `updatePattern()`: Updates occurrence count and timespan
- `shouldPromptCommitment()`: Determines if pattern hits threshold
- `processNewSignal()`: Main pipeline for incoming signals

**Pattern Matching:**
Uses Jaccard similarity coefficient to compare normalized intents:
```
similarity = |A ∩ B| / |A ∪ B|
```
Threshold: 0.7 similarity = same pattern

**Stake Calculation:**
```typescript
density = occurrences / days
if (density > 1) stake = $20  // Multiple times per day
if (density > 0.5) stake = $15 // Every other day
if (density > 0.3) stake = $10 // Few times a week
else stake = $5 // Baseline
```

### Input Sources (`client/src/lib/input-sources.ts`)

**Source Classes:**
- `VoiceNoteSource`: Microphone access + transcription
- `MessageSource`: Platform connections (SMS, WhatsApp, etc.)
- `CalendarSource`: Event pattern analysis
- `JournalSource`: NLP extraction from entries
- `InputSourceManager`: Unified interface for all sources

**Integration Points:**
- Voice: Web Speech API / Deepgram for transcription
- Messages: Platform APIs (Twilio, WhatsApp Business API)
- Calendar: Google Calendar / Outlook OAuth
- Journal: Day One / Notion / Evernote APIs

### State Management (`client/src/lib/mock-data.tsx`)

**New Context Methods:**
```typescript
captureSignal(text, sourceType) // Create and process signal
getActivePatterns() // Get patterns with status='active'
dismissPattern(patternId) // User ignores pattern
lockInPattern(patternId) // Convert pattern to commitment
syncInputSources() // Poll all connected sources
```

**Storage:**
- Signals and patterns persist in localStorage (mock mode)
- Production: Supabase database with Drizzle ORM

### UI Components

**Pages:**
- `/detection` ([detection.tsx](client/src/pages/detection.tsx)): Main pattern dashboard
  - Shows active patterns with urgency badges
  - Quick capture form for manual signals
  - Recent signals timeline
  - Sync button for input sources

**Components:**
- `DetectionBadge`: Notification bell with pattern count (in header)
- `PatternPrompt`: Inline prompt card when threshold hit
- `PatternSummaryWidget`: Dashboard widget showing top patterns
- `PatternDetectionListener`: Auto-trigger high-urgency prompts

## User Flows

### Flow 1: Automatic Detection
1. User mentions "I need to start working out" in voice note
2. System transcribes → creates signal → normalizes to "start working out"
3. Matches against existing patterns or creates new one
4. After 5th mention in 7 days → triggers prompt
5. User clicks "Lock It In" → redirects to `/lock-in` with pre-filled intent

### Flow 2: Manual Capture
1. User navigates to `/detection`
2. Types intent in quick capture: "I want to spend more time with my kids"
3. Selects source type (manual, voice, message, etc.)
4. System processes → updates or creates pattern
5. If threshold met → shows inline prompt

### Flow 3: Background Sync
1. System polls connected sources every N minutes
2. `syncInputSources()` calls each source's polling method
3. New signals processed through detection algorithm
4. Patterns updated in background
5. User sees notification badge in header when patterns detected

## Configuration

### Thresholds (Configurable in `passive-detection.ts`)
```typescript
HIGH_URGENCY = { count: 5, days: 7 }
MEDIUM_URGENCY = { count: 4, days: 14 }
LOW_URGENCY = { count: 3, days: 21 }
CONFIDENCE_THRESHOLD = 0.3
SIMILARITY_THRESHOLD = 0.7
```

### Mock Mode Setup
All sources have mock implementations for development:
- Voice: Auto-generates transcript after 2s
- Messages: Returns fake message threads
- Calendar: Simulates repeated gym events
- Journal: Parses for "want to" / "need to" patterns

### Production Setup
1. Add real OAuth credentials to Supabase Edge Functions
2. Deploy `process_intent_signal` function for background processing
3. Set up cron job for `sync_input_sources` (every 15 min)
4. Configure webhooks for real-time signal ingestion (Twilio, etc.)

## Testing

### Quick Test Flow
1. Start dev server: `pnpm dev`
2. Login via `/auth`
3. Navigate to `/detection`
4. Use quick capture to add 3+ similar intents:
   - "I want to work out more"
   - "I need to start exercising"
   - "I should go to the gym"
5. After 3rd signal, pattern should appear with "Lock It In" button
6. Click button → should redirect to `/lock-in` with intent pre-filled

### Test Pattern Detection Algorithm
```typescript
import { processNewSignal, shouldPromptCommitment } from '@/lib/passive-detection';

const signal = {
  id: 'test',
  userId: 'user123',
  sourceType: 'manual',
  rawText: 'I really need to start working out',
  detectedAt: new Date().toISOString(),
  processed: false
};

const { updatedPattern, detectionResult } = processNewSignal(signal, []);
console.log(detectionResult); // { shouldPrompt: false, urgency: 'low' }
```

## Future Enhancements

### Phase 2: Smart Detection
- Embedding-based similarity (OpenAI embeddings)
- Context-aware categorization (time of day, location)
- Intent sentiment analysis (genuine vs. casual mention)
- Temporal patterns (weekend intentions vs. weekday)

### Phase 3: Proactive Nudging
- Predictive detection ("You usually mention this on Sundays")
- Contextual prompts (location-based: "At gym again without checking in?")
- Escalation patterns (increasing stakes with repeated failures)

### Phase 4: Social Integration
- Detect shared intents with friends ("3 people in your circle mentioned gym")
- Group commitments with shared stakes
- Public accountability feeds

## API Reference

### Edge Functions (To Be Created)

**`process_intent_signal`**
```typescript
POST /functions/v1/process_intent_signal
Body: { user_id, source_type, raw_text }
Returns: { signal_id, pattern_id?, should_prompt }
```

**`sync_input_sources`**
```typescript
POST /functions/v1/sync_input_sources
Body: { user_id }
Returns: { signals_created, patterns_updated }
```

**`get_active_patterns`**
```typescript
GET /functions/v1/get_active_patterns?user_id=xxx
Returns: { patterns: IntentPattern[] }
```

## Troubleshooting

**Patterns not detecting:**
- Check confidence threshold (default 0.3)
- Verify signal normalization in console logs
- Ensure signals have similar normalized text (Jaccard > 0.7)

**UI not updating:**
- Signals/patterns stored in localStorage - check browser storage
- Force refresh after capturing signals
- Check React DevTools for context state

**Sources not syncing:**
- Mock mode: All sources return fake data (check `input-sources.ts`)
- Production: Verify OAuth tokens in `inputSources` table
- Check Edge Function logs for sync errors

## License
See main project LICENSE
