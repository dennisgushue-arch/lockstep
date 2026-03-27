# Passive Detection System - Quick Test Guide

## Start the App

```bash
pnpm dev
```

## Test Flow

### 1. Login
- Navigate to http://localhost:5000/auth
- Enter any email (e.g., `test@example.com`)
- Click "Send Magic Link" → Auto-logs you in (mock mode)

### 2. Test Pattern Detection

#### Option A: Via Detection Page
1. Go to `/detection` (or click "Detection" in nav)
2. Use the Quick Capture form at the top
3. Type similar intents 3+ times:
   - "I want to start working out"
   - "I need to exercise more"
   - "I should go to the gym"
4. After 3rd capture, pattern card should appear with "LOCK IT IN" button

#### Option B: Via Dashboard
1. Dashboard shows "Active Patterns" widget when patterns exist
2. Click widget to go to detection page
3. Or wait for high-urgency pattern (5+ in 7 days) → auto-prompt appears bottom-right

### 3. Lock In Pattern
1. Click "LOCK IT IN" button on any pattern
2. Should redirect to `/lock-in` with intent pre-filled
3. Complete the commitment flow as usual

### 4. Test Different Categories

**Fitness:**
- "I want to go for a run"
- "I need to hit the gym"
- "I should work out"

**Work:**
- "I need to finish that project"
- "I should start my side business"
- "I want to code more"

**Social:**
- "I want to spend more time with my kids"
- "I should call my parents"
- "I need to see my friends"

### 5. Test Input Sources (Mock Mode)

```javascript
// In browser console on /detection page
const { syncInputSources } = window.__APP_CONTEXT__; // if exposed
// Or just click "Sync Sources" button - it will add mock signals
```

Mock sources return:
- **Messages**: "I keep saying I'll start that side business"
- **Calendar**: "Morning workout session (created 5 times, attended 0)"

### 6. Check Pattern Detection Logic

Open browser DevTools console and look for:
```
[Mock Supabase] Processing signal: {...}
Signal processing skipped: Low confidence signal
```

Low confidence signals (< 0.3) are stored but don't create patterns.

### 7. Test Dismissal
1. Click "Dismiss" (X button) on any pattern
2. Pattern disappears and won't prompt again
3. Check localStorage: `intent_mock_patterns` → status should be "dismissed"

### 8. Test Badge Notification
1. Create 3+ patterns
2. Look at header nav → Bell icon should show red badge with count
3. Click bell → redirects to `/detection`

## Expected Behaviors

### Pattern Threshold Matrix

| Occurrences | Days | Urgency | Badge Color | Suggested Stake |
|-------------|------|---------|-------------|-----------------|
| 5+ | ≤7 | High | Red | $20 |
| 4+ | ≤14 | Medium | Orange | $15 |
| 3+ | ≤21 | Low | Gray | $10 |

### Confidence Scoring

Base: 0.5
- Has commitment words ("must", "need to", "should"): +0.2
- Has temporal signals ("tomorrow", "next week"): +0.15
- Has action verbs ("start", "finish"): +0.1
- Has uncertainty ("maybe", "might"): -0.2
- Very short (< 5 words): -0.1

Minimum threshold: 0.3

### Similarity Matching

Two intents match if Jaccard similarity > 0.7:
- "I want to work out" ↔ "I need to exercise" = ~0.6 (might not match)
- "I want to work out" ↔ "I should work out" = ~0.8 (matches)

## Debugging

### Check localStorage
```javascript
// Browser console
localStorage.getItem('intent_mock_signals')
localStorage.getItem('intent_mock_patterns')
```

### Clear All Data
```javascript
localStorage.clear()
// Then refresh page
```

### Check Pattern Status
```javascript
// In React DevTools
// Find AppProvider context
// Look at intentPatterns array → each has status: 'active' | 'locked' | 'dismissed'
```

### Force High Urgency Pattern

Manually edit localStorage:
```javascript
const patterns = JSON.parse(localStorage.getItem('intent_mock_patterns') || '[]');
patterns[0].occurrenceCount = 6;
patterns[0].daySpan = 5;
localStorage.setItem('intent_mock_patterns', JSON.stringify(patterns));
// Refresh page → should show high urgency prompt
```

## Known Limitations (Mock Mode)

1. **No real transcription** - Voice notes use fake transcript
2. **No real OAuth** - Input source connections are simulated
3. **No real NLP** - Uses simple keyword matching
4. **No persistence across sessions** - Data only in localStorage
5. **No background sync** - Must manually click "Sync Sources"

## Next Steps for Production

1. Deploy `process_intent_signal` Edge Function
2. Add real OAuth flows for messaging/calendar
3. Integrate real transcription service (Deepgram/Whisper)
4. Set up background cron for auto-sync
5. Add webhook endpoints for real-time signal ingestion
6. Use embedding-based similarity instead of Jaccard

## Troubleshooting

**Patterns not appearing:**
- Check console for "Low confidence signal"
- Ensure 3+ similar intents captured
- Verify normalized intent similarity (add more varied wording)

**Badge not showing:**
- Patterns must have status='active'
- Check intentPatterns in React DevTools
- Ensure user is logged in

**Lock-in not working:**
- Check that currentIntent is set after clicking "Lock In"
- Verify redirect to `/lock-in` happened
- Pattern should have status='locked' after
