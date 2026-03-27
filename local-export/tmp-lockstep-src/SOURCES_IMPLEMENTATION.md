# SOURCES IMPLEMENTATION CHECKLIST

Build in this order. Each item is independently shippable.

---

## PHASE 1: CORE (This Week)

### 1.1 Voice Notes Capture & Transcription

- [ ] **Frontend: Voice Recording Component**
  - Record button with duration timer
  - Visual feedback (red circle = recording)
  - Stop button → upload to Supabase storage
  - File: `client/src/components/voice-note-recorder.tsx`

- [ ] **Backend: Upload & Transcription**
  - Create `supabase/functions/transcribe_voice_note/index.ts`
  - Use Anthropic Whisper API (not local)
  - Store transcription in `voice_notes.transcription`
  - Delete raw audio file after transcription
  - Trigger intent extraction immediately after

- [ ] **Database: Voice Notes Table**
  - ✅ Already in migration 006
  - Ensure indexes created
  - Test insertion & retrieval

### 1.2 Intent Extraction from Voice

- [ ] **Supabase Function: Extract Intent**
  - File: `supabase/functions/extract_intent_from_voice/index.ts`
  - Input: transcription text
  - Output: ExtractedIntent (intent, emotion, obstacles, suggested_stake, deadline)
  - Use Claude 3.5 Sonnet with structured prompt
  - Store results in `voice_notes` table

- [ ] **Prompt Engineering**
  - Test 5 different voice note styles
  - Iterate on extraction accuracy
  - Ensure it captures: urgency, obstacles, emotion

### 1.3 Recommendation Engine

- [ ] **Supabase Function: Generate Pact**
  - File: `supabase/functions/recommend_pact_from_source/index.ts`
  - Input: ExtractedIntent + user context
  - Output: RecommendedPact
  - Consider: historical failure rate, calendar load, similar commitments
  - Generate formal pact wording (mirror + rewrite)

- [ ] **Frontend: Recommendation Screen**
  - Show extracted intent
  - Show AI-recommended wording
  - Show suggested stake + deadline
  - Show risk factors
  - "Create this pact" button
  - File: `client/src/pages/voice-note-recommendation.tsx`

### 1.4 Google Calendar Integration

- [ ] **OAuth Setup**
  - Configure Google OAuth in Supabase
  - Create client credentials (web + potentially mobile)
  - Set redirect URI: `https://yourapp.com/auth/callback`

- [ ] **Auth Endpoint**
  - File: `client/src/lib/calendar-connector.ts`
  - `initiateCalendarAuth()` - redirects to Google
  - `handleCalendarAuthCallback()` - stores token

- [ ] **Calendar Sync Function**
  - File: `supabase/functions/sync_google_calendar/index.ts`
  - Fetch events from Google Calendar API
  - Normalize into `calendar_events` table
  - Store: title, start, end, description (optional)
  - Run on: first auth + periodic (hourly)

- [ ] **Pattern Detection**
  - File: `supabase/functions/detect_calendar_patterns/index.ts`
  - Analyze next 7-day calendar
  - Detect: busy days, overload, recurring patterns
  - Return: risk_level + suggestions

- [ ] **Frontend: Calendar Status**
  - Show in settings: "Last synced X hours ago"
  - "Sync now" button
  - Show overload warnings on dashboard

### 1.5 Settings Page: Connected Sources

- [ ] **Settings UI**
  - ✅ Already built in `client/src/pages/connected-sources.tsx`
  - Show connection status for each source
  - "Connect" buttons (OAuth or navigation)
  - "Sync now" and "Disconnect" options

- [ ] **Database: Source Connections**
  - ✅ Table `user_source_connections` created
  - Store OAuth tokens securely (encrypted)
  - Track last sync time + status

---

## PHASE 2: ENRICHMENT (Next Week)

### 2.1 Share-to-Lockstep (iOS)

- [ ] **Configure iOS Share Extension**
  - Register custom app groups
  - Allow share sheet target
  - Shared message goes to app via pasteboard

- [ ] **Handle Shared Messages**
  - File: `client/src/lib/message-handler.ts`
  - Parse shared message from pasteboard
  - Store in `shared_messages` table
  - Trigger extraction

- [ ] **Extract Intent from Message**
  - File: `supabase/functions/extract_intent_from_message/index.ts`
  - Similar to voice intent extraction
  - Detect: work vs personal, urgency, verbs

### 2.2 Daily Check-In Prompts

- [ ] **Check-In Screen**
  - File: `client/src/pages/checkin.tsx`
  - 3 prompts: avoided, scared, tomorrow
  - 30–60 second responses (encourage brevity)

- [ ] **Check-In Extraction**
  - File: `supabase/functions/extract_commitments_from_checkin/index.ts`
  - Parse responses for commitment signals
  - Generate suggested pact(s)

- [ ] **Push Notification**
  - Send daily check-in reminder (configurable time)
  - Link to `/checkin` page

---

## PHASE 3: ADVANCED (Later)

### 3.1 Android SMS (Optional)

- [ ] Research SMS read permissions (Android 12+)
- [ ] Build Android-specific share sheet handler
- [ ] Test with Firebase Cloud Messaging for permission dialog

### 3.2 Slack/Email Integration

- [ ] Slack bot for work commitments
- [ ] Email forwarding server (lambda@lockstep.app)

### 3.3 Browser Extension

- [ ] Detect web-based task tools (Asana, Linear, Jira)
- [ ] Allow "Create commitment from this task" flow
- [ ] Extension for desktop work context

---

## DATABASE DEPLOYMENT

```bash
# Apply migration
supabase migration up

# Verify tables created
supabase db pull  # should show new tables

# Run in local Postgres (optional, for testing)
psql $DATABASE_URL < supabase/migrations/006_sources_and_voice_notes.sql
```

---

## API ENDPOINTS

### Transcription

```
POST /functions/v1/transcribe_voice_note
body: { voiceNoteId: string }
returns: { transcription: string }
```

### Intent Extraction

```
POST /functions/v1/extract_intent_from_voice
body: { transcription: string, emotion?: string }
returns: ExtractedIntent
```

### Pact Recommendation

```
POST /functions/v1/recommend_pact
body: {
  source: 'voice_note' | 'message' | 'checkin',
  extracted_intent: ExtractedIntent,
  user_context?: { calendar_load, historical_rate }
}
returns: RecommendedPact
```

### Calendar Sync

```
POST /functions/v1/sync_google_calendar
body: { }
returns: { synced_count: number, error?: string }
```

---

## TESTING CHECKLIST

### Voice Notes
- [ ] Record 5 different types of voice notes
- [ ] Verify transcription accuracy
- [ ] Test intent extraction on each
- [ ] Verify stake recommendation logic
- [ ] Test with: urgent tone, scattered thoughts, multi-part commitments

### Calendar
- [ ] Connect real Google account
- [ ] Verify events sync correctly
- [ ] Test pattern detection on busy week
- [ ] Verify overload detection
- [ ] Test with: all-day events, back-to-back meetings, recurring events

### Recommendations
- [ ] User with high failure rate → higher stake
- [ ] User with full calendar → shorter deadline
- [ ] Detect duplicate/similar commitments → warn
- [ ] Verify formal pact rewrite is accurate

---

## ENVIRONMENT VARIABLES

```
# .env.local (for Supabase Functions)
ANTHROPIC_API_KEY=sk-...  # For Claude intent extraction
GOOGLE_CLIENT_ID=...       # For Calendar OAuth
GOOGLE_CLIENT_SECRET=...

# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## SUCCESS METRICS

✅ **After Phase 1**:
- Users can record voice notes and see AI-extracted commitments
- Calendar sync working for 90%+ of users
- Recommended pacts are at 80%+ accuracy
- Settings page shows all sources

✅ **After Phase 2**:
- iOS share-to-Lockstep working
- Daily check-ins happening for 40%+ of DAU
- Pact creation from check-ins at 60%+ accuracy

✅ **After Phase 3**:
- Multi-platform support (iOS + Android + Web)
- Enterprise integration (Slack, work email)
- Browser context for desk workers

---

## RISK MITIGATION

**What could go wrong**:

1. **OAuth token expiration**
   - Solution: Refresh token logic in sync function
   - Alert user if refresh fails

2. **Google Calendar rate limits**
   - Solution: Implement exponential backoff
   - Cache recent events locally

3. **Transcription quality (bad audio)**
   - Solution: Show confidence score
   - Let user re-record

4. **AI extraction is wrong**
   - Solution: Always let user edit before accepting
   - Log feedback to improve prompts

5. **Privacy concerns**
   - Solution: Clear data retention policy
   - Show exactly what's stored
   - Export option
   - Easy deletion

---

## LAUNCH CHECKLIST

Before shipping Phase 1:

- [ ] Privacy policy updated (what data we store, how long)
- [ ] Terms updated (user data ownership)
- [ ] OAuth consent screen polished
- [ ] Error messages are helpful
- [ ] Logging in place for debugging
- [ ] Rate limiting on transcription (don't bankrupt on API)
- [ ] Tests passing (unit + integration)
- [ ] Staging environment tested end-to-end
- [ ] Analytics tracking intent source distribution
- [ ] Help docs for each source
- [ ] Support ready for OAuth issues

---

## NEXT STEPS

1. **Today**: Approve architecture
2. **Tomorrow**: Start on voice recorder component + transcription
3. **This week**: Have voice → recommendation flow working
4. **Next week**: Calendar sync + pattern detection
5. **Week 3**: Settings UI polish + privacy docs
6. **Week 4**: Phase 1 launch + metrics tracking
