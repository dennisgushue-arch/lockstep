# 🚀 Phase 1 Launch Checklist

## 1️⃣ Get API Keys (5 min)
- [ ] OpenAI API Key: `sk-...`
- [ ] Anthropic API Key: `sk-ant-...`
- [ ] Google Client ID: `...apps.googleusercontent.com`
- [ ] Google Client Secret: `...`
- [ ] All 5 keys saved somewhere secure

## 2️⃣ Set Secrets in Supabase (3 min)
- [ ] OPENAI_API_KEY set
- [ ] ANTHROPIC_API_KEY set
- [ ] GOOGLE_CLIENT_ID set
- [ ] GOOGLE_CLIENT_SECRET set
- [ ] GOOGLE_REDIRECT_URI set to `http://localhost:5173/auth/calendar-callback`
- [ ] All 5 visible in Supabase Secrets page

## 3️⃣ Create Storage Bucket (2 min)
- [ ] SQL executed in Supabase
- [ ] `audio_files` bucket appears in Storage sidebar
- [ ] RLS policies created

## 4️⃣ Configure Google OAuth (2 min)
- [ ] Consent screen configured
- [ ] `calendar.readonly` scope added
- [ ] Your email added as test user
- [ ] Status shows "Configured"

## 5️⃣ Set Frontend Environment Variables (1 min)
- [ ] `.env.local` created in project root
- [ ] VITE_SUPABASE_URL set
- [ ] VITE_SUPABASE_ANON_KEY set
- [ ] VITE_GOOGLE_CLIENT_ID set

## 6️⃣ Test Voice Notes Page (5 min)
- [ ] `npm run dev` started
- [ ] Page loads at `http://localhost:5173/voice-notes`
- [ ] Microphone permission works
- [ ] Can record 30-60 second sample
- [ ] Recording stops and shows duration
- [ ] Click "EXTRACT"
- [ ] Wait 5-15 seconds
- [ ] See extracted intent with all 5 fields
- [ ] Confidence score shows
- [ ] Click "CREATE PACT"
- [ ] Success message appears
- [ ] New commitment on dashboard

## 7️⃣ Test Recommendations Page (Optional, 5 min)
- [ ] Navigate to `http://localhost:5173/recommendations`
- [ ] Your voice note appears as recommendation
- [ ] Shows confidence score
- [ ] Shows suggested stake
- [ ] "CREATE THIS PACT" button works

## 8️⃣ Launch! 🎯
- [ ] All tests passed
- [ ] Production environment variables set
- [ ] Deploy frontend to hosting
- [ ] Update Google OAuth redirect URI for production
- [ ] Test in production
- [ ] Announce feature to users
- [ ] Monitor logs and costs

---

## Time Budget
- Getting keys: 5 min
- Supabase setup: 3 min
- Storage bucket: 2 min
- Google OAuth: 2 min
- Environment vars: 1 min
- Testing: 10 min
- **Total: ~25 minutes** ⏱️

## Success Looks Like
After Step 6, you should see:
```
✅ Page loads
✅ Microphone works
✅ Recording shows duration
✅ Extraction takes 5-15 seconds
✅ Intent displayed with confidence
✅ Pact created successfully
✅ Dashboard shows new commitment
```

## If Stuck
1. Check `PHASE_1_LAUNCH.md` troubleshooting section
2. Check Supabase Functions logs
3. Check browser console (F12)
4. Verify all 5 API keys are set
5. Verify storage bucket exists

---

**You've got this! 🚀**
