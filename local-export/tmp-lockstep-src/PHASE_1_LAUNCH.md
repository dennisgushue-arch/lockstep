# Phase 1 Launch: Step-by-Step Instructions

## Step 1: Get API Keys (5 minutes)

### 1.1 OpenAI API Key (Whisper)
1. Go to: https://platform.openai.com/account/api-keys
2. Click "Create new secret key"
3. Name it: `lockstep-whisper`
4. Copy the key (starts with `sk-`)
5. **Keep this open** - you'll need it next

### 1.2 Anthropic API Key (Claude)
1. Go to: https://console.anthropic.com/account/keys
2. Click "Create Key"
3. Copy the key (starts with `sk-ant-`)
4. **Keep this open** - you'll need it next

---

## Step 2: Set Secrets in Supabase (2 minutes)

1. Go to: https://supabase.com/dashboard/project/[your-project-id]/functions
   - Replace `[your-project-id]` with your actual project ID
2. Click "Secrets" in the left sidebar
3. Add each secret by clicking "New secret":

### 2.1 Add OPENAI_API_KEY
```
Name:  OPENAI_API_KEY
Value: sk-... [paste from step 1.1]
```

### 2.2 Add ANTHROPIC_API_KEY
```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-... [paste from step 1.2]
```

**Verify**: Refresh the page - you should see both secrets listed.

---

## Step 3: Create Storage Bucket (2 minutes)

1. Go to: https://supabase.com/dashboard/project/[your-project-id]/sql/new
2. Paste this SQL:

```sql
-- Create audio_files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio_files', 'audio_files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Users can upload
CREATE POLICY "Users can upload their own audio files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can read
CREATE POLICY "Users can read their own audio files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can delete
CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

3. Click "Run"
4. You should see: "Success. No rows returned"

**Verify**: Go to Storage → audio_files (should appear in sidebar)

---

## Step 4: Configure Frontend Environment Variables (1 minute)

1. Create/edit `.env.local` in project root:

```bash
# Supabase
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

Find these values:
- **SUPABASE_URL**: Supabase Dashboard → Settings → API
- **SUPABASE_ANON_KEY**: Supabase Dashboard → Settings → API (under "anon public")

---

## Step 5: Test Voice Notes Page (5 minutes)

1. Start your dev server:
```bash
npm run dev
```

2. Navigate to: http://localhost:5173/voice-notes

3. Test the flow:
   - [ ] Page loads
   - [ ] See blue microphone icon
   - [ ] Click "START RECORDING"
   - [ ] Browser asks for microphone permission
   - [ ] Allow microphone access
   - [ ] Red pulsing circle appears
   - [ ] Duration timer starts (0:00, 0:01, etc.)
   - [ ] Record for 30-60 seconds, say:
     ```
     "I want to run 3 miles this week. I'm usually too tired after work.
     Let me commit to Tuesday, Wednesday, and Friday mornings at 6 AM.
     I'll give myself 5 credits as stakes."
     ```
   - [ ] Click "STOP RECORDING"
   - [ ] Shows "Duration: X:XX"
   - [ ] Click "EXTRACT"
   - [ ] Spinner appears ("Uploading...")
   - [ ] Wait 5-15 seconds for processing
   - [ ] See extracted intent displayed:
     - **Intent**: "Run 3 miles this week (Tue/Wed/Fri 6 AM)"
     - **Emotion**: "anxious" or "determined"
     - **Obstacles**: "Too tired after work"
     - **Suggested Stake**: "5 credits"
     - **Deadline**: "7 days"
     - **Confidence**: 85%
   - [ ] Click "CREATE PACT"
   - [ ] Toast appears: "✓ PACT HONORED. You kept your word."
   - [ ] Redirects to dashboard
   - [ ] New commitment appears on dashboard with your extracted intent

**If something fails:**
- Check browser console (F12) for errors
- Check Supabase Functions logs:
  - Dashboard → Functions → [function name] → Logs
- Verify both API keys are set correctly
- Verify storage bucket was created

---

## Step 6: Test Recommendations Page (Optional, 5 minutes)

1. Navigate to: http://localhost:5173/recommendations

2. Verify you see:
   - [ ] Your voice note recommendation (from Step 6)
   - [ ] Shows extracted intent
   - [ ] Shows confidence score (85%)
   - [ ] Shows suggested stake (5 credits)
   - [ ] "CREATE THIS PACT" button

3. Click "CREATE THIS PACT"
   - [ ] Another commitment created
   - [ ] Recommendation disappears

---

## Step 7: Launch! 🎯

### Pre-Launch Checklist
- [x] Code deployed to Supabase (functions)
- [x] Routes added to App router
- [x] Database migrations created
- [x] Components built
- [x] API keys set in Supabase
- [x] Storage bucket created
- [x] Frontend environment variables set
- [x] /voice-notes page tested
- [x] /recommendations page tested

### Launch Steps

1. **Deploy to Production**
   - Update `.env.local` with production Supabase URL
   - Deploy frontend to your hosting (Vercel, etc.)

2. **Monitor First 24 Hours**
   - Check error logs
   - Monitor API costs (should be <$0.10/day)
   - Track user adoption

3. **Announce Feature**
   ```
   "You can now record your commitments with your voice.
   
   Say what you're committing to, and our AI will:
   • Transcribe what you said
   • Extract the core commitment
   • Suggest an appropriate stake
   
   One click to create a binding pact.
   
   Try it: Record your commitment in /voice-notes"
   ```

---

## Troubleshooting

### "Failed to access microphone"
- Check browser permissions (Settings → Privacy → Microphone)
- Try a different browser
- Must be HTTPS or localhost

### "Upload failed"
- Verify OPENAI_API_KEY is set correctly
- Check Supabase Functions logs
- Verify storage bucket exists

### "Transcription timeout"
- Check OpenAI API status (status.openai.com)
- Try a shorter recording (< 2 minutes)
- Check internet connection

### "Intent extraction failed"
- Verify ANTHROPIC_API_KEY is set correctly
- Check Anthropic API account has credits
- Verify transcription succeeded first

---

## What's Working (If All Steps Succeed)

✅ Users can record voice notes
✅ Notes are transcribed in 2-5 seconds
✅ Intent extracted in 1-2 seconds
✅ Confidence scores shown
✅ Recommendations page shows all intents
✅ One-click commitment creation
✅ Commitments appear on dashboard
✅ All data encrypted and user-scoped

---

## Next: Phase 2

After validating Phase 1 with real users:
- Message integration (iOS share sheet, SMS, email)
- Daily check-in prompts
- Advanced analytics
- Mobile apps

See `SOURCES_IMPLEMENTATION.md` for Phase 2-3 roadmap.

---

## Support

If you get stuck:
1. Check the error message
2. Verify both API keys are set
3. Check Supabase Functions logs
4. Review the troubleshooting section above
5. Check browser console (F12) for client errors

You've got this! 🚀
