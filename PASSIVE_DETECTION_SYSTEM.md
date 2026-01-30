# Passive Intent Detection System

## The Killer Feature

**The core insight**: People constantly express intentions in casual conversation, voice notes, messages, and calendar entries. But these intentions are scattered, forgotten, and never acted upon.

**Our solution**: An AI-powered passive detection system that:
1. Listens across all your input channels (voice, text, calendar, journal)
2. Extracts and normalizes intents automatically
3. Detects patterns when you mention the same thing repeatedly
4. Prompts you to lock in commitments with real consequences

## How It Works

### 1. Signal Capture

Users express intentions through multiple channels:

- **Voice Notes**: Speak into the app or upload audio files
- **Text Messages**: Forward texts or connect messaging apps  
- **Calendar Events**: Sync your calendar, we analyze event titles/descriptions
- **Journal Entries**: Write freeform, we extract commitments
- **Manual Capture**: Quick text input for immediate capture

### 2. Intent Extraction & Normalization

The system processes raw text to extract core intents:

```
"I really should start working out more consistently"
→ Normalized: "start working out"
→ Category: fitness
→ Confidence: 0.85
```

**Key Algorithms** (`client/src/lib/passive-detection.ts`):

- `normalizeIntent()`: Strips filler words, extracts action + object
- `categorizeIntent()`: Classifies into fitness, work, growth, social, habits, creative, finance
- `calculateIntentConfidence()`: Scores 0-1 based on commitment language, temporal signals, action verbs

### 3. Pattern Detection

The system clusters similar intents and tracks:

- **Occurrence Count**: How many times mentioned
- **Day Span**: Days between first and last mention
- **Urgency**: Calculated from frequency density
- **Suggested Stake**: Increases with repetition

**Urgency Levels**:
- **HIGH**: 5+ mentions OR 1+ per day
- **MEDIUM**: 3+ mentions OR 0.5+ per day
- **LOW**: 2 mentions

### 4. User Prompting

When patterns reach significance thresholds:

1. Pattern appears on `/detection` page with urgency badge
2. Shows: mentions, days span, suggested credit cost
3. One-click "Lock In" button → redirects to `/lock-in` with intent pre-filled
4. User chooses credit cost, consequence type, deadline

### 5. Commitment Lifecycle

Once locked in:
- Credits are spent upfront (no payment friction)
- Deadline set, commitment tracked
- Complete on time → get credits back (if refundable)
- Miss deadline → credits gone forever

## UI/UX Flow

### Detection Page (`/detection`)

**Quick Capture Card**:
- Source selector (Manual, Voice, Message, Journal, Calendar)
- Large textarea for pasting thoughts
- Voice input button (Web Speech API in production)
- Real-time capture with confirmation
- Cmd+Enter keyboard shortcut

**Stats Dashboard**:
- Detected Patterns count
- Total Signals captured
- Urgent Actions (patterns needing immediate attention)

**Pattern Cards**:
- Large category emoji background
- Urgency badge (URGENT, HIGH, MODERATE)
- Mention count, day span, suggested stake
- "Dismiss" or "Lock In Now" buttons
- First mentioned timestamp

**Signal History**:
- Chronological list of all captured signals
- Source icons
- Category badges
- Confidence indicators

### Integration with Credits System

The passive detection flow seamlessly integrates with the new credits system:

1. Pattern detected → "Lock In" button
2. Redirects to `/lock-in` with intent pre-filled
3. Shows credit cost tiers (based on symbolic stake amount)
4. User has sufficient credits → lock in instant
5. Insufficient credits → link to `/credits` to purchase more

## Technical Architecture

### Frontend Components

- **`client/src/pages/detection.tsx`**: Main detection UI
- **`client/src/lib/passive-detection.ts`**: Core algorithms
- **`client/src/lib/input-sources.ts`**: Integration adapters
- **`client/src/lib/mock-data.tsx`**: State management

### Backend (Edge Functions)

- **`process_intent_signal`**: Analyze incoming signal, extract metadata
- **`get_active_patterns`**: Query patterns for a user
- **`sync_input_sources`**: Pull from connected sources (calendar, messages, etc.)

### Database Schema

**`intent_signals`** table:
- `id`, `user_id`, `source_type`, `source_id`
- `raw_text`, `normalized_intent`, `category`
- `confidence`, `detected_at`, `processed`

**`intent_patterns`** table:
- `id`, `user_id`, `normalized_intent`, `category`
- `first_detected_at`, `last_detected_at`
- `occurrence_count`, `day_span`, `status`
- `suggested_stake`, `related_signal_ids`

**`input_sources`** table:
- `id`, `user_id`, `source_type`
- `connected`, `auth_token`, `last_sync_at`, `settings`

## Current Integrations

### ✅ Working Now (Mock Mode)

- Manual text capture
- Voice notes (simulated transcription)
- Pattern detection and clustering
- Urgency scoring
- Lock-in flow integration

### 🚧 Production Integrations (Roadmap)

1. **Voice**: Web Speech API / OpenAI Whisper transcription
2. **SMS**: Twilio integration, forward texts to dedicated number
3. **WhatsApp**: WhatsApp Business API webhook
4. **Calendar**: Google Calendar / Apple Calendar OAuth sync
5. **Email**: IMAP scanning for specific phrases
6. **Browser Extension**: Capture from any text field

## Key Design Decisions

### Why Pattern Detection Over Single Capture?

**Problem**: One-off mentions are often fleeting thoughts, not real commitments.

**Solution**: Wait for repetition. If you say it 3+ times, it's a real pattern worth locking in.

**Benefits**:
- Reduces false positives (casual mentions)
- Increases commitment strength (proven by repetition)
- Natural escalation (more mentions = higher suggested stake)

### Why Credits Instead of Direct Payment Per Commitment?

See [CREDITS_SYSTEM.md] - removes payment friction from the lock-in moment, which is critical when acting on detected patterns.

### Why Normalize Intents Aggressively?

Raw text varies wildly:
- "I should start working out"
- "Really need to hit the gym"
- "Gotta start exercising again"

All mean the same core intent: "work out"

Aggressive normalization clusters these together to detect patterns.

### Why Calculate Confidence?

Not all captured text represents genuine intent:
- "Maybe I'll work out sometime" → Low confidence (vague)
- "I MUST start working out tomorrow morning" → High confidence (specific + temporal)

Low confidence signals don't trigger immediate prompts but still contribute to pattern detection.

## Metrics to Track

### User Engagement
- Signals captured per user per week
- Pattern detection rate (signals → patterns)
- Lock-in conversion (patterns → commitments)

### System Performance
- Intent normalization accuracy
- Confidence score calibration
- Pattern clustering precision (false positives)

### Business Impact
- Time-to-first-commitment (lower = better)
- Commitment completion rate (by detection source)
- Credits spent on detected patterns vs. manual commitments

## Future Enhancements

### 1. Semantic Clustering
Currently uses simple string similarity. Upgrade to:
- Sentence embeddings (OpenAI, Cohere)
- Vector similarity matching
- Cross-intent clustering ("work out" + "get in shape" = same pattern)

### 2. Temporal Intelligence
Detect timing patterns:
- "Every Monday I say I'll work out" → auto-suggest Monday deadline
- "Said it 3 times in January" → seasonal pattern detection

### 3. Social Context
- Detect when multiple people mention the same thing
- Group commitments ("Let's all run a 5K")
- Public shame integration (auto-post failures)

### 4. Predictive Prompting
- "You always say this on Sundays. Ready to commit?"
- "Last 3 times you mentioned this, you didn't lock in. Why not now?"

### 5. Smart Stake Suggestions
Currently simple: more mentions = higher stake

Future: Personalized based on:
- Income data (if provided)
- Historical completion rates
- Category importance (user-specific)

## Why This Wins

### The Competition

- **Beeminder**: Manual goal setting, clunky UI, no passive capture
- **Stickk**: Requires upfront planning, no pattern detection
- **Focusmate**: Accountability buddies, but no financial stakes
- **Coach.me**: Too gentle, no real consequences

### Our Advantage

1. **Zero Planning Required**: Just live your life, we capture everything
2. **Pattern Recognition**: We know you better than you know yourself
3. **Automatic Escalation**: The more you say it, the higher the stakes
4. **Multi-Channel**: Voice, text, calendar, journal - we're everywhere
5. **Real Money**: Credits create actual loss aversion, not fake points

## Testing the System

### Local Development

1. Start app: `pnpm dev`
2. Navigate to `/detection`
3. Use Quick Capture to add intents:
   - "I really need to start working out more"
   - "Should probably start going to the gym"
   - "Gotta start exercising consistently"
4. Watch pattern appear with 3 mentions
5. Click "Lock In Now" → redirects to `/lock-in`
6. See intent pre-filled, choose credits, set deadline

### Mock Voice Input

Click "Start Voice Input" → simulates 2-second recording → auto-fills textarea

### Sync Sources

Click "Sync All Sources" → simulates fetching from connected integrations

## Success Metrics

**Good Detection System**:
- 80%+ of users capture ≥1 signal per week
- 50%+ of patterns lead to lock-ins
- 30%+ of commitments come from detected patterns (not manual)

**Great Detection System**:
- 90%+ capture ≥3 signals per week
- 70%+ pattern lock-in rate
- 60%+ commitments from passive detection

This is the feature that makes Lockstep impossible to compete with.
