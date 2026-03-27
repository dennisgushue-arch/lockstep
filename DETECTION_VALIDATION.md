# Detection Flow Validation

## Test Date: March 4, 2026

### ✅ Components Validated

#### 1. Journal → Detection Flow
- [x] Journal check-ins capture intent signals (`journal.tsx` → `captureSignal`)
- [x] Journal source parses intent-like phrases
- [x] Journal signals sync via `syncCheckIns` in `input-sources.ts`
- [x] Journal source card shows in Connected Sources with count

#### 2. Detection Page Integration
- [x] `captureSignal` function processes text from journal
- [x] Signals stored in `intentSignals` state
- [x] Patterns detected via `processNewSignal`
- [x] Active patterns displayed on `/detection` page

#### 3. Recommendations Page
- [x] Journal intents extracted from localStorage
- [x] Voice note recommendations loaded from Supabase
- [x] Calendar pattern recommendations (if connected)
- [x] Journal filter badge with count
- [x] Badge grays out when count is 0
- [x] Toggle to hide/show journal recommendations

#### 4. Connected Sources
- [x] Journal card displays with amber icon
- [x] Check-in count shown
- [x] Last sync timestamp displayed
- [x] Sync Now button updates timestamp
- [x] Connect button routes to `/journal`

### 🔄 End-to-End Flow Test

#### Flow: Journal Check-in → Detection → Recommendation

**Step 1: Create Journal Check-in**
```
Navigate to: /journal?commitment_id=<id>
Input: "I need to start working out three times a week"
Action: Click SAVE CHECK-IN
```

**Expected:**
- Check-in saved to localStorage (`intent_checkins`)
- Signal captured via `captureSignal(..., "journal")`
- Intent added to `intentSignals` state

**Step 2: Sync Detection Sources**
```
Navigate to: /detection
Action: Click SYNC ALL SOURCES
```

**Expected:**
- `syncInputSources()` called
- Journal signals parsed from localStorage
- New patterns created/updated
- Detection cards appear on page

**Step 3: View Recommendations**
```
Navigate to: /recommendations
```

**Expected:**
- Journal recommendations appear (max 3)
- Badge shows "Journal ON · {count}"
- Recommendations have amber BookOpen icon
- Clicking badge toggles visibility

**Step 4: Connected Sources Status**
```
Navigate to: /connected-sources
```

**Expected:**
- Journal card shows check-in count
- Last synced timestamp visible
- Sync Now button functional
- Connect button routes to /journal

### 🚨 Known Limitations

#### Voice Detection
- ❌ **API Keys Required**: `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` not in `.env`
- ⚠️ Voice transcription will fail without keys
- ⚠️ Intent extraction will fail after upload

#### Calendar Detection
- ❌ **OAuth Flow Missing**: No server route for `/api/auth/google-calendar`
- ❌ **Callback Missing**: No page/route for `/auth/calendar-callback`
- ⚠️ Calendar connection will fail
- ⚠️ Calendar pattern detection won't run

#### Detection Page
- ✅ Mock sources work for demo/testing
- ⚠️ Real sources need OAuth + API keys

### 🔧 Quick Fixes for Full Detection

#### To Enable Voice Detection:
1. Add to Supabase Edge Function secrets:
   - `OPENAI_API_KEY=sk-...`
   - `ANTHROPIC_API_KEY=sk-ant-...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`

2. Restart edge functions or redeploy

#### To Enable Calendar Detection:
1. Get Google OAuth credentials
2. Add `VITE_GOOGLE_CLIENT_ID` to `.env`
3. Create server route `/api/auth/google-calendar`
4. Create callback page `/auth/calendar-callback`
5. Wire OAuth flow in `initiateCalendarAuth()`

#### To Enable Real-time Detection:
1. Enable passive detection in settings
2. Keystroke monitor will capture signals
3. Background sync can run on interval

### ✅ Current Status Summary

**Working:**
- ✅ Journal check-in → detection
- ✅ Journal → recommendations
- ✅ Detection page (mock mode)
- ✅ Recommendations filtering
- ✅ Connected sources status

**Needs Setup:**
- ⚠️ Voice detection (API keys)
- ⚠️ Calendar OAuth (credentials + routes)
- ⚠️ Real-time passive detection (opt-in)

### 📝 Validation Result

**Detection Flow Status: ✅ FUNCTIONAL** (with mock sources)

The core detection architecture works:
1. Signals are captured from journal
2. Patterns are detected and stored
3. Recommendations are surfaced
4. Connected sources show status

**For Production:**
- Add API keys for voice
- Implement calendar OAuth
- Test with real user data

