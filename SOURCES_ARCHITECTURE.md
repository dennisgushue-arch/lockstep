# LOCKSTEP SOURCES ARCHITECTURE

Consent-based data connectors that feed AI intent detection.

## The Insight

Users don't fail because they can't write commitments.
They fail because their **commitments don't match their reality**.

Calendar says: "You have 5 meetings today + gym + email"
User says: "I'm going to meditate for 30 minutes"
*Result: Inevitable failure*

The app's job: **Make the mismatch visible. Suggest the real pact.**

---

## Consent-First Design

**Golden Rule**: User explicitly connects each source. No dark patterns.

```
Settings → Connected Sources
├── Google Calendar (OAuth)
├── Voice Notes (app-native)
├── Text Messages (share sheet)
├── Email (forwarding)
└── Daily Check-in (optional)
```

---

## Source 1: GOOGLE CALENDAR (High Value, Easiest)

### What We Detect

```
✓ Time commitments you already made
✓ Overloaded days (risk of failure)
✓ Patterns (gym Mon/Wed/Fri → "training commitment")
✓ Missed events (no follow-up)
✓ Context for pact timing
```

### Implementation

#### A. OAuth Flow

```javascript
// client/src/lib/calendar-connector.ts

export async function initiateCalendarAuth() {
  const scope = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  
  // Redirect to Google OAuth
  // Callback handles token storage in Supabase
}

export async function fetchCalendarEvents(userId: string, days: number = 7) {
  // Get user's OAuth token from Supabase
  // Query Google Calendar API
  // Return normalized events
}
```

#### B. Event Normalization

```typescript
// supabase/migrations/004_sources.sql

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  source_id VARCHAR NOT NULL, -- "google_calendar" 
  external_id VARCHAR NOT NULL, -- Google event ID
  title VARCHAR NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  description TEXT,
  location VARCHAR,
  color VARCHAR, -- Calendar color for category detection
  is_busy BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ,
  
  UNIQUE(user_id, source_id, external_id)
);

-- Index for fast queries
CREATE INDEX idx_calendar_events_user_time 
ON calendar_events(user_id, start_time DESC);
```

#### C. Pattern Detection

```typescript
// supabase/functions/detect_calendar_patterns/index.ts

// For calendar events in next 7 days, detect:

interface CalendarPattern {
  eventCount: number;
  busyMinutes: number;
  daysOverbooked: number; // > 8 hours
  likelyFailureRisk: 'low' | 'medium' | 'high';
  suggestions: string[]; // "Your Wed is fully booked—reduce new commitments"
}

export async function detectCalendarPatterns(userId: string) {
  const events = await getUpcomingEvents(userId, 7);
  
  const busyDays = groupBy(events, e => e.start_time.toDateString());
  
  const daysOverbooked = Object.entries(busyDays)
    .filter(([_, evts]) => {
      const minutes = evts.reduce((sum, e) => 
        sum + (e.end_time - e.start_time) / 60000, 0
      );
      return minutes > 480; // > 8 hours
    }).length;
  
  // Detect recurring patterns
  const titlePatterns = findRecurringTitles(events);
  // "gym" on Mon/Wed/Fri → suggest commitment
  
  return {
    eventCount: events.length,
    daysOverbooked,
    likelyFailureRisk: daysOverbooked > 2 ? 'high' : 'medium',
    suggestions: generateSuggestions(events, titlePatterns)
  };
}
```

---

## Source 2: VOICE NOTES (Highest Leverage)

### What This Does

User **records what they're thinking** → system extracts:
- Clear intent
- Emotion (urgency, fear, excitement)
- Obstacles
- AI-suggested commitment

### Implementation

#### A. Voice Recording Component

```typescript
// client/src/components/voice-note-recorder.tsx

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function VoiceNoteRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      await uploadVoiceNote(audioBlob);
    };
    
    mediaRecorder.start();
    setIsRecording(true);
  }

  async function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function uploadVoiceNote(audioBlob: Blob) {
    // Upload to Supabase storage
    const fileName = `${Date.now()}.webm`;
    const { data, error } = await supabase.storage
      .from('voice_notes')
      .upload(`${userId}/${fileName}`, audioBlob);
    
    if (!error) {
      // Trigger transcription + AI extraction
      await supabase.functions.invoke('extract_intent_from_voice', {
        body: { voiceNoteId: fileName }
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-6xl font-black text-red-400">
        {isRecording ? '●' : '○'} {formatTime(duration)}
      </div>
      
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className="w-full h-16 bg-gradient-to-r from-red-600 to-red-700 
                   hover:from-red-500 hover:to-red-600 
                   text-white font-black"
      >
        {isRecording ? '⏹ STOP' : '🎤 RECORD'}
      </button>
    </div>
  );
}
```

#### B. Voice Note Storage

```sql
-- supabase/migrations/005_voice_notes.sql

CREATE TABLE voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  audio_url VARCHAR NOT NULL, -- Supabase storage path
  duration_seconds INT,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  
  -- AI extraction
  transcription TEXT,
  transcription_model VARCHAR, -- "whisper-1"
  transcribed_at TIMESTAMPTZ,
  
  -- Intent extraction
  extracted_intent VARCHAR, -- The core commitment
  emotion VARCHAR, -- "urgent", "uncertain", "excited"
  obstacles TEXT, -- What's blocking
  suggested_stake INT, -- AI-recommended credits
  suggested_deadline TIMESTAMPTZ,
  
  -- User action
  created_commitment_id UUID REFERENCES commitments(id),
  dismissed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_notes_user_date 
ON voice_notes(user_id, recorded_at DESC);
```

#### C. Transcription + Intent Extraction

```typescript
// supabase/functions/extract_intent_from_voice/index.ts

import Anthropic from "@anthropic-ai/sdk";

interface ExtractedIntent {
  intent: string; // The commitment in their words
  emotion: string; // Emotional tone
  obstacles: string[]; // What's blocking them
  suggestedStake: number; // 5-50 credits
  suggestedDeadline: string; // ISO string
  confidence: number; // 0-1
  reasoning: string; // Why this extraction
}

export async function extractIntentFromVoice(audioUrl: string): Promise<ExtractedIntent> {
  // 1. Transcribe with Whisper
  const transcription = await transcribeAudio(audioUrl);
  
  // 2. Extract intent with Claude
  const client = new Anthropic();
  
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `
You are analyzing a voice note where someone is expressing a commitment/intention.

TRANSCRIPTION:
"${transcription}"

Extract:
1. The core commitment they're making (in 1 sentence, in their voice)
2. Emotional tone (urgent/uncertain/excited/scared)
3. Obstacles they mentioned
4. Suggested consequence type (financial/social/health)
5. How long until deadline (hours/days)

Respond in JSON:
{
  "intent": "...",
  "emotion": "...",
  "obstacles": [...],
  "suggestedConsequence": "...",
  "suggestedDeadlineHours": number,
  "confidence": 0.95
}
`
      }
    ]
  });

  const extracted = JSON.parse(response.content[0].type === 'text' ? response.content[0].text : '{}');
  
  return {
    intent: extracted.intent,
    emotion: extracted.emotion,
    obstacles: extracted.obstacles,
    suggestedStake: estimateStake(extracted.emotion, extracted.obstacles.length),
    suggestedDeadline: calculateDeadline(extracted.suggestedDeadlineHours),
    confidence: extracted.confidence,
    reasoning: `User voice shows ${extracted.emotion} tone with ${extracted.obstacles.length} obstacles`
  };
}

function estimateStake(emotion: string, obstacleCount: number): number {
  // Scared + multiple obstacles = higher stake to incentivize
  const emotionWeight = { urgent: 20, uncertain: 15, excited: 10, scared: 25 };
  const base = emotionWeight[emotion as keyof typeof emotionWeight] || 10;
  return Math.min(base + (obstacleCount * 3), 50);
}
```

---

## Source 3: TEXT MESSAGES (Safe Implementation)

### Why "Share Sheet" Not "Read All Texts"

**Bad approach**: Request SMS read permission
- Invasive
- Regulatory nightmare
- Breaks trust

**Good approach**: User explicitly shares
- Forwards message to Lockstep email
- Uses "Share to Lockstep" action (iOS share sheet)
- User has control

### Implementation

```typescript
// For iOS Share Sheet integration:

// client/src/lib/message-handler.ts

// When message is shared to app via iOS share sheet:
interface SharedMessage {
  content: string;
  timestamp: Date;
  source: string; // "sms" | "imessage" | "slack_forward" | "email_forward"
}

export async function ingestSharedMessage(msg: SharedMessage) {
  // Store in messages table
  const { data } = await supabase
    .from('shared_messages')
    .insert({
      user_id: currentUser.id,
      content: msg.content,
      source: msg.source,
      received_at: msg.timestamp
    });
  
  // Extract intent (same pattern as voice)
  await supabase.functions.invoke('extract_intent_from_message', {
    body: { messageId: data[0].id }
  });
}

// For email forwarding (work commitments):
// User forwards email to: commitments+{userId}@lockstep.app
// Lambda/Edge function parses and ingests
```

### Storage

```sql
CREATE TABLE shared_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  source VARCHAR NOT NULL, -- "sms", "imessage", "slack", "email"
  content TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  
  -- AI extraction
  extracted_intent VARCHAR,
  context VARCHAR, -- "work" | "health" | "relationships" | "personal"
  sentiment VARCHAR, -- "positive" | "negative" | "urgent"
  suggested_stake INT,
  
  created_commitment_id UUID REFERENCES commitments(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Source 4: DAILY CHECK-IN (Optional but Valuable)

### 30-Second Journal Prompts

```typescript
// client/src/pages/checkin.tsx

export function DailyCheckIn() {
  const [responses, setResponses] = useState({
    avoided: "",
    scared: "",
    tomorrow: ""
  });

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <label className="text-lg font-bold text-white block mb-2">
          What did you avoid today?
        </label>
        <textarea 
          value={responses.avoided}
          onChange={(e) => setResponses({...responses, avoided: e.target.value})}
          className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded p-3 text-white"
          placeholder="Be honest..."
        />
      </div>

      <div>
        <label className="text-lg font-bold text-white block mb-2">
          What are you scared of?
        </label>
        <textarea 
          value={responses.scared}
          onChange={(e) => setResponses({...responses, scared: e.target.value})}
          className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded p-3 text-white"
          placeholder="Fear, shame, embarrassment..."
        />
      </div>

      <div>
        <label className="text-lg font-bold text-white block mb-2">
          What matters tomorrow?
        </label>
        <textarea 
          value={responses.tomorrow}
          onChange={(e) => setResponses({...responses, tomorrow: e.target.value})}
          className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded p-3 text-white"
          placeholder="Your priority..."
        />
      </div>

      <button 
        onClick={() => submitCheckIn(responses)}
        className="w-full h-14 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-black"
      >
        SUBMIT
      </button>
    </div>
  );
}
```

---

## The AI Layer: 3 Jobs

### Job 1: CLASSIFY

```typescript
type CommitmentCategory = 'health' | 'money' | 'relationships' | 'work' | 'personal';

export async function classifyIntent(text: string): Promise<CommitmentCategory> {
  // Use Claude to categorize
  // Used for: filtering, streak tracking, pattern analysis
}
```

### Job 2: EXTRACT

```typescript
interface ExtractedCommitment {
  verb: string; // "run", "meditate", "complete", "ship"
  target: string; // "5k", "30 minutes", "design doc", "v2"
  deadline: Date;
  difficulty: 1 | 2 | 3 | 4 | 5; // AI estimates
  category: CommitmentCategory;
}

export async function extractCommitment(
  source: string, // "voice_note" | "calendar" | "message"
  content: string
): Promise<ExtractedCommitment> {
  // Use Claude to extract structured commitment
}
```

### Job 3: RECOMMEND

```typescript
interface RecommendedPact {
  suggestedWording: string; // Formal pact rewrite
  suggestedStake: number; // 5-50 credits based on difficulty
  suggestedDeadline: Date; // Based on context
  verificationMethod: 'manual' | 'calendar' | 'voice' | 'checkin';
  riskFactors: string[]; // "Your calendar is already full", "You avoided this before"
  confidenceScore: number; // 0-1, based on clarity of input
}

export async function recommendPact(
  extractedCommitment: ExtractedCommitment,
  userContext: {
    historicalFailureRate: number;
    currentLoad: number; // busy-ness
    similarCommitments: Commitment[];
  }
): Promise<RecommendedPact> {
  // Synthesize all context
  // Return recommended stake (higher = more commitment difficulty)
  // Return deadline suggestion
  // Return any risk warnings
}
```

---

## Implementation Roadmap

### Phase 1 (This Week)

```
✅ Voice notes + transcription
✅ Calendar connector (Google OAuth)
✅ AI extraction + recommendation
✅ "Suggest Pact" screen showing AI recommendation
```

### Phase 2 (Next Week)

```
✅ Share-to-Lockstep for messages
✅ Email forwarding for work commitments
✅ Daily check-in prompts
```

### Phase 3 (Later)

```
✅ Android SMS (optional)
✅ Slack integration (work users)
✅ Browser extension (desktop work)
```

---

## The Magic Moment

User records voice note:
```
"I keep saying I'll go to the gym but I don't. 
It's 6 AM, I'm tired, and I just scroll.
I need to actually do this."
```

System responds:
```
COMMITMENT DETECTED

You are committing to:
"Go to the gym at 6 AM, 3 days per week 
(Monday, Wednesday, Friday)"

Based on your voice note + calendar analysis:
• Your mornings are usually free
• You've tried this before and failed
• We recommend: 15 credit stake (higher)

Consequence: Donate $15 to charity if you skip

Ready to sign?
```

That's the product moment that keeps people coming back.

---

## Privacy & Trust (Critical)

**What we store**:
- Transcribed text (never raw audio)
- Extracted intent (never full context)
- Calendar events (metadata only, not descriptions)

**What we never store**:
- Raw audio files (delete after transcription)
- Full message/email text (only key phrases)
- Sensitive calendar details (description text)

**User control**:
- Delete any source at any time
- Disconnect any calendar/email
- View exactly what we extracted
- Opt-out of any AI suggestions

This is **transparency + consent**, not surveillance.
