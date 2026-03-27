# Lockstep Demo Walkthrough

## Quick Start (5 minutes)

1. **Open the app**: http://localhost:5000
2. **Sign in with any email**: e.g., `demo@example.com`
3. **You're now in Mock Mode** - all features work without Supabase/Stripe

---

## Core Features Demo

### 1. Passive Intent Detection
The heart of Lockstep's value proposition.

**What's happening**: The app listens for patterns in your casual thoughts, voice notes, texts, and calendar entries. When you mention something 3+ times or 0.5+ times per day, it bubbles up as an "Intent" that you can lock in with stakes.

**Try it**:
- Go to **Detection** page → Click **Load Demo** button
- See pre-populated patterns:
  - **"Call mom"** (MODERATE urgency, 2 mentions over 1 day)
  - **"Start working out"** (HIGH urgency, 2 mentions over 3 days)

### 2. Pattern Cards
Each card shows:
- 📌 **Category Icon** - Fitness, Work, Social, Habits, etc.
- **Urgency Badge** - URGENT (5+ mentions), HIGH (3+), MODERATE (2)
- **Mention Count** - How many times detected
- **Time Span** - Over how many days
- **Suggested Stake** - AI estimate of ideal dollar amount

**Example: "Call mom"**
```
👥 MODERATE | 2 mentions | Over 1 day | Suggest $25
"I should call mom" (from voice note, 2 days ago)
"I keep saying I should call mom but never do" (message, 1 day ago)
```

### 3. Lock In a Commitment
From any pattern card, click **"Lock In"**:

1. You're taken to **Lock-In Flow**
2. System suggests a **Credit Cost** based on stake amount
   - Example: $25 stake = 25 credits
3. You choose a **deadline** (7, 14, or 30 days)
4. Toggle **Refund on Completion** (get credits back if you win)
5. Click **Lock In** - commitment is created immediately
   - In mock mode: no Stripe required
   - In production: Stripe capture happens on failure only

### 4. Dashboard
Track all your commitments:
- **Active**: Scheduled, waiting on deadline
- **Completed**: You marked it done manually
- **Missed**: Deadline passed, credits spent

**Mock Mode Feature**: On the dashboard, click the **"Run Miss Check"** button to simulate the cron job that checks overdue commitments at the end of the day.

---

## Credits System

### How Credits Work
Instead of paying per-commitment, you buy credits upfront in bulk packages.

**Credit Packages** (in production with real Stripe):
- **100 credits** - $9.99 (10¢ per credit)
- **250 credits** - $19.99 (8¢ per credit) ← Best for casual users
- **500 credits** - $34.99 (7¢ per credit)
- **1000 credits** - $59.99 (6¢ per credit) ← Best for power users

**Why credits?**
1. **Zero friction at lock-in** - No payment processing delays
2. **Bulk buying incentives** - Better rates for committed users
3. **Predictable budgets** - Buy once, use all month
4. **Refund mechanics** - Easy to give back credits on success

### Current Balance
- View in **navigation bar** (top right, credit bag icon)
- See full history on **Credits page**

**In mock mode**: You start with 500 demo credits

---

## Advanced: Passive Detection Algorithm

### Three Tiers of Intent Strength

#### 1. URGENT (Should Lock In Immediately)
- **5+ mentions** OR **1+ mentions per day**
- Example: "I really need to work out" + "Should go to gym" + "Getting fat"
- **Message**: "This is on your mind constantly. Lock it in!"

#### 2. HIGH (Worth Locking In)
- **3+ mentions** OR **0.5+ mentions per day**
- Example: "Call mom" mentioned 2x in 1 day = 2 mentions/day
- **Message**: "Pattern detected. Want to commit to this?"

#### 3. MODERATE (Consider Locking In)
- **2 mentions** OR **Appears 2+ days in a row**
- Example: Mentioned on Monday and Friday
- **Message**: "We've heard this before. Interested?"

### How Patterns Are Detected

1. **Capture**: User inputs casual text via Quick Capture, voice note, message forward, calendar entry, or journal paste
2. **Normalize**: Strip filler words ("I should", "I need to", "I really want to")
   - Input: "I really should start working out more consistently"
   - Output: "start working out"
3. **Categorize**: AI assigns to one of 8 categories
   - Fitness, Work, Growth, Social, Habits, Creative, Finance, Other
4. **Cluster**: Group similar intents using Jaccard similarity (80%+ match)
   - "work out" ~ "go to gym" ~ "hit the weights"
5. **Score**: Calculate urgency based on:
   - Frequency (mentions per day)
   - Recency (how fresh is the latest mention)
   - Commitment language ("I absolutely must" vs "maybe I should")
   - Time span (detected over how many days)

### Example: "Call Mom" Pattern
```
Signal 1: "I should call mom this weekend" (calendar, 2 days ago)
  → Normalized: "call mom"
  → Category: social
  → Confidence: 0.92

Signal 2: "I keep saying I should call mom but never do" (message, 1 day ago)
  → Normalized: "call mom"
  → Category: social
  → Confidence: 0.88

Pattern Created:
  - normalizedIntent: "call mom"
  - occurrenceCount: 2
  - daySpan: 1
  - status: active
  - urgency: MODERATE (2 mentions in 1 day)
  - suggestedStake: $25 (social commitments typically $15-50)
```

---

## Input Sources (Future Integrations)

Currently available (mock simulation):
- ✅ **Manual Entry** - Type/paste in Quick Capture
- ✅ **Voice Note** - Record audio, transcribed via Web Speech API
- ✅ **Message** - Forward texts/WhatsApp/Slack
- ✅ **Journal** - Paste diary entries
- ✅ **Calendar** - Scan event titles and notes

**In production, integrations will include**:
- 🎤 Web Speech API → Server-side transcription via Google Cloud Speech
- 📞 Twilio SMS webhook for text forwarding
- 💬 WhatsApp Business API
- 📧 Gmail IMAP scanning
- 📅 Google Calendar OAuth
- 🌐 Browser extension for universal text capture

---

## Full User Journey

### Day 1: Passive Detection
```
10:00 AM: User records voice note
         "I really need to start working out more"
         → System detects intent: "start working out"

3:30 PM: User texts friend about gym
         "I should really go to the gym 3x a week"
         → System detects similar intent, adds to pattern

5:00 PM: User opens Detection page
         → Sees "Start Working Out" pattern (2 mentions, HIGH urgency)
         → Clicks "Lock In"
```

### Day 2: Commitment Locked
```
User on Lock-In page:
  - Pattern: "Start working out"
  - Suggested stake: $50
  - Credit cost: 50 credits
  - Current balance: 500 credits ✓ (enough)
  - Deadline: 14 days
  - Refund: Enabled

User clicks "Lock In"
  → Commitment created
  → Credits deducted: 500 - 50 = 450 credits
  → Deadline set: 14 days from now
```

### Day 15 (Post-Deadline): Check-In
```
Option A: User marks as COMPLETED
  → Refund of 50 credits
  → Balance: 450 + 50 = 500 credits
  → Celebration screen with stats

Option B: Cron job finds overdue commitment
  → Status auto-changes to MISSED
  → Credits already spent (no additional capture)
  → User sees it on dashboard
  → Reflection page shows what went wrong
```

---

## Admin Panel (for Testing)

Visit **http://localhost:5000/admin** to:
- ✅ View all raw commitment data
- ✅ Trigger the daily "miss check" cron job manually
- ✅ Inspect intent patterns and signals
- ✅ Reset demo data

This simulates the `sweep_overdue_commitments` cron job that normally runs daily in production.

---

## Key Metrics to Watch

### Personal Success Rate
- How many commitments do you complete?
- What categories have highest success?
- What stake amounts work best for you?

### Pattern Detection Accuracy
- Are the detected patterns relevant?
- Do they match what you actually care about?
- Is the urgency scoring right?

### Credit Economics
- How many credits per month do you use?
- What's your average stake per commitment?
- Do you take the refund option?

---

## What Makes This Different

### vs. Habit Trackers (Habitica, Streaks)
- **Problem solved**: Habit trackers require you to pre-plan everything
- **Lockstep**: Captures your natural thoughts and patterns automatically

### vs. To-Do Lists (Todoist, Things)
- **Problem solved**: You already have thoughts scattered everywhere—phone notes, voice memos, texts
- **Lockstep**: Pulls them in automatically and surfaces the patterns

### vs. Commitment Apps (Beeminder, StickK)
- **Problem solved**: Those require you to manually input commitments upfront
- **Lockstep**: Waits for the pattern to emerge (you mention something 3x), then asks you to commit

### The Killer Feature
**Real-money stakes activate the intention loop**:
1. You casually think about something 3+ times
2. System says "You care about this"
3. You lock in with a $25 stake (because it's important enough to cost money)
4. Now you actually do it (66% vs 10% base completion rate)
5. You either win back the credits or lose them
6. Over time, you learn what you actually care about

---

## Troubleshooting

### "No patterns detected"
- Click **Load Demo** to populate example data
- Or manually enter some Quick Capture entries
- Patterns require 2+ similar mentions to appear

### "Not enough credits"
- Go to **Credits page**
- In mock mode: You get 500 free demo credits
- In production: Click a package tier to buy more via Stripe

### "Commitment not showing on dashboard"
- Try clicking **Run Miss Check** on Admin page
- Or wait for the cron job to run (normally daily in production)

### "Voice input not working"
- In mock mode, voice is simulated (just type text)
- In production with real deployment: Enable microphone permissions
- Uses Web Speech API → Google Cloud Speech transcription

---

## Next Steps for Production

1. **Deploy Edge Functions**
   ```bash
   supabase functions deploy purchase_credits
   supabase functions deploy confirm_credit_purchase
   supabase functions deploy complete_commitment
   supabase functions deploy fail_commitment
   ```

2. **Stripe Integration**
   - Get live keys from Stripe dashboard
   - Add `VITE_STRIPE_PUBLISHABLE_KEY` to Vercel
   - Add `STRIPE_SECRET_KEY` and webhook signing secret to Supabase

3. **Database Migration**
   - Run: `pnpm db:push`
   - Adds `credit_balance` to users table
   - Creates `credit_transactions` table

4. **Input Source Integrations**
   - Email: IMAP scanning for flagged messages
   - Voice: Web Speech API + Google Cloud Speech
   - Calendar: Google OAuth + Calendar API
   - SMS: Twilio webhook for message forwarding
   - Messages: WhatsApp Business API webhook

5. **Monitoring**
   - Set up Sentry for error tracking
   - Monitor stripe webhook failures
   - Track detection accuracy metrics

---

**Happy building! The next billion-dollar app is just cold hard cash + your natural thinking.** 💰🧠
