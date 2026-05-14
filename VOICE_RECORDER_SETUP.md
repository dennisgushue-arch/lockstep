# Voice Recorder Setup: Next Steps ✅

## ✅ Completed

1. **Voice Recording Component** (`client/src/components/voice-note-recorder.tsx`)
   - Ready to use component with full UI
   - Handles recording, review, and upload states

2. **Voice Notes Page** (`client/src/pages/voice-notes.tsx`)
   - Full page with recorder component
   - Shows extracted intent review
   - Create/Discard actions

3. **Supabase Functions - DEPLOYED**
   - ✅ `transcribe_voice_note` - deployed successfully
   - ✅ `extract_intent_from_voice` - deployed successfully
   - Both functions are live on your Supabase project

4. **App Routes Updated** (`client/src/App.tsx`)
   - ✅ `/voice-notes` route added
   - ✅ `/history` route added
   - ✅ `/connected-sources` route added
   - All routes imported and configured

---

## ⚠️ Still Need to Do

### 1. Create Audio Storage Bucket

The migration file has been created: `supabase/migrations/007_create_audio_storage.sql`

When you're ready to run it:

```bash
cd /workspaces/lockstep
supabase migration up
```

Or manually in Supabase Dashboard SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio_files', 'audio_files', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for RLS on audio files
CREATE POLICY "Users can upload their own audio files"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own audio files"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 2. Set Supabase Function Environment Variables

In your Supabase Dashboard → Functions → Environment Variables:

```
OPENAI_API_KEY=sk-...  # Get from OpenAI API dashboard
ANTHROPIC_API_KEY=sk-ant-...  # Get from Anthropic/Claude API
```

**Getting API Keys:**

- **OpenAI**: <https://platform.openai.com/api-keys>
- **Anthropic**: <https://console.anthropic.com/account/keys>

### 3. Update Client Environment Variables

In `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Test the Flow

1. Navigate to `/voice-notes`
2. Click "START RECORDING"
3. Say: "I want to exercise 3 times this week at 6 AM. I'm scared I'll sleep through the alarm."
4. Click "STOP RECORDING"
5. Click "EXTRACT"
6. Wait for transcription (Whisper API) and extraction (Claude)
7. Review extracted intent
8. Click "CREATE PACT"

---

## Current Status by Component

| Component | Status | Notes |
|-----------|--------|-------|
| Voice Recorder (React) | ✅ Complete | Component ready to use |
| Voice Notes Page | ✅ Complete | Full page built |
| Transcription Function | ✅ Deployed | Live on Supabase |
| Extraction Function | ✅ Deployed | Live on Supabase |
| App Routes | ✅ Updated | Routes added to router |
| Storage Bucket | ⏳ Pending | Migration created, needs to run |
| API Keys | ⏳ Pending | Need to add to Supabase |
| End-to-End Testing | ⏳ Pending | Ready after API keys set |

---

## Files Created/Modified

### New Files

- ✅ `client/src/components/voice-note-recorder.tsx` - Voice recording component
- ✅ `client/src/pages/voice-notes.tsx` - Voice notes page
- ✅ `supabase/functions/transcribe_voice_note/index.ts` - Whisper API integration
- ✅ `supabase/functions/extract_intent_from_voice/index.ts` - Claude API integration
- ✅ `supabase/migrations/007_create_audio_storage.sql` - Storage bucket + RLS

### Modified Files

- ✅ `client/src/App.tsx` - Added 3 new routes (voice-notes, history, connected-sources)
- ✅ `client/src/pages/history.tsx` - Added export function keyword

---

## Deployment Status

### Frontend Routes

```
✅ /voice-notes → VoiceNotesPage
✅ /history → HistoryPage
✅ /connected-sources → ConnectedSourcesPage
```

### Supabase Functions

```
✅ transcribe_voice_note
   Endpoint: https://[project-id].supabase.co/functions/v1/transcribe_voice_note
   Status: ACTIVE

✅ extract_intent_from_voice
   Endpoint: https://[project-id].supabase.co/functions/v1/extract_intent_from_voice
   Status: ACTIVE
```

### Storage

```
⏳ audio_files bucket
   Status: Needs migration to create
   Path: audio_files/voice-notes/{user_id}/{timestamp}.webm
```

---

## Quick Start (After API Keys)

1. **Get API Keys**
   - OpenAI (<https://platform.openai.com/api-keys>)
   - Anthropic (<https://console.anthropic.com/account/keys>)

2. **Set Function Secrets**
   - Supabase Dashboard → Edge Functions → Secrets / Environment Variables / Settings
   - Add `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`

3. **Create Storage Bucket**

   ```bash
   supabase migration up
   ```

4. **Test in Browser**
   - Sign in first (voice-note upload requires auth)
   - Navigate to `http://localhost:5000/voice-notes`
   - Record → Extract → Create

---

## Troubleshooting

**"Failed to access microphone"**

- Check browser permissions for microphone
- Only works over HTTPS or localhost

**"Upload failed"**

- Check `OPENAI_API_KEY` is set in Supabase
- Check storage bucket exists
- Check RLS policies are correct
- Make sure you are signed in before uploading

**"Transcription timeout"**

- Whisper API sometimes takes 5-10s
- Long recordings (>30min) may fail
- Consider max 2-3 minute recordings

**"Intent extraction failed"**"**

- Check `ANTHROPIC_API_KEY` is set
- Check Claude API account has credits
- Check transcription was successful

---

## What's Happening Under the Hood

### Flow Diagram

```
User records voice
       ↓
[VoiceNoteRecorder] captures audio blob
       ↓
User clicks "EXTRACT"
       ↓
Audio uploaded to Supabase Storage
       ↓
transcribe_voice_note function:
  - Receives audio file
  - Calls OpenAI Whisper API
  - Gets transcription text
  - Creates voice_notes DB record
  ↓
extract_intent_from_voice function:
  - Receives voiceNoteId
  - Fetches transcription from DB
  - Sends to Claude with structured prompt
  - Gets JSON back: intent, emotion, obstacles, etc.
  - Updates voice_notes record
  ↓
[VoiceNotesPage] shows extracted intent
       ↓
User reviews and clicks "CREATE PACT"
       ↓
New commitment created from extracted_intent
       ↓
Redirect to app home (`/`), then verify commitment on dashboard
```

---

## Success Criteria

After completing all steps, you should be able to:

✅ Navigate to `/voice-notes`
✅ Record a voice note successfully
✅ See real-time duration timer
✅ Upload and transcribe in <10 seconds
✅ Extract intent in <5 seconds
✅ Review all extracted fields (intent, emotion, obstacles, stake, deadline)
✅ Create commitment from voice note
✅ See new commitment on dashboard

---

## Rate Limits & Costs

**OpenAI Whisper API**

- ~$0.0001 per minute of audio
- Included in Free Tier credits

**Anthropic Claude API**

- ~$0.0008 per request (3.5 Sonnet)
- Free tier: $5/month after free credits

**Recommendation**: In production, implement:

- Audio caching to avoid duplicate transcriptions
- Batch processing for off-peak times
- Feedback loop to improve extraction accuracy

---

## Next Phase (After Testing)

Once voice recorder is working, next implement:

1. Google Calendar sync (detect calendar overload)
2. Pattern detection (suggest commitments based on patterns)
3. Daily check-in flow (optional journal prompts)
4. Recommendation dashboard (show AI suggestions)
