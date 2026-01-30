# Lockstep Complete System Architecture

## Bird's Eye View

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOCKSTEP ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT SOURCES                   AI PROCESSING                 │
│  ───────────────                 ──────────────                │
│  🎤 Voice Notes          →  1. Normalize Intent               │
│  💬 Messages             →  2. Categorize                      │
│  📅 Calendar             →  3. Calculate Confidence            │
│  📝 Journal              →  4. Cluster Similar Intents         │
│  📧 Email                →  5. Compute Urgency Score           │
│                                                                 │
│         ↓ Pattern Detected (3+ mentions) ↓                    │
│                                                                 │
│  PATTERN CARD (UI)               COMMITMENT (Lock-In)          │
│  ──────────────────               ───────────────────          │
│  👥 Category Icon        →  Pick Deadline                      │
│  🔥 Urgency Badge        →  Choose Credit Cost                │
│  2️⃣ Mention Count        →  Toggle Refund Option              │
│  ⏰ Time Span             →  Lock In (Real Money!)             │
│  💰 Suggested Stake                                            │
│                                 ↓                              │
│                          DASHBOARD (Track)                      │
│                          ──────────────                        │
│                          Active Commitments                     │
│                          Completed / Missed                     │
│                          Refunds & Stats                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Components

### 1. Frontend (React 19 + Vite)

#### Core Pages

**`capture.tsx`** - Initial intent capture
- Single-turn conversation with user
- AI analysis via `analyze_intent` Edge Function
- Outputs: category, goal, first_action, reflection

**`detection.tsx`** - Passive intent detection hub
- Quick Capture card with source selector
- Voice input simulation (Web Speech API ready)
- Active patterns display with urgency badges
- Pattern cards with signal history
- "Load Demo" button for testing
- Admin trigger for cron job simulation

**`lock-in.tsx`** - Commitment creation flow
- Credit cost calculator (linear: stake $ = credit count)
- Deadline picker (7/14/30 days)
- Refund toggle (Optional: get credits back on completion)
- Credit balance display with warning if insufficient
- Actual commitment creation (no Stripe card UI needed)

**`dashboard.tsx`** - Commitment tracker
- All commitments (active, completed, missed)
- Status indicators with color badges
- Quick actions: Mark Complete, View Reflection
- Credit balance badge in header
- Total stats: Active/Completed/Missed counts

**`credits.tsx`** - Credit purchase & history
- 4 tier packages with bulk discounts
- Package details: credits, price, per-credit cost, bulk savings
- Stripe CardElement integration (production only)
- Transaction history (purchase, spend, refund)
- Filter by transaction type

**`lock-in.tsx`** & **`reflection.tsx`** - Post-completion
- Why did you succeed or fail?
- Learn what works for you
- Streak tracking and celebration

#### State Management

**`mock-data.tsx`** - AppProvider Context
- Global app state: user, intentions, commitments, credits
- Pattern detection state: intentSignals, intentPatterns
- Functions:
  - `captureSignal(text, sourceType)` - Detect and create signal/pattern
  - `loadDemoData()` - Populate with example patterns
  - `createCommitment()` - Deduct credits and create commitment
  - `completeCommitment()` - Mark done, refund if enabled
  - `dismissPattern()` - Hide pattern from UI

**Mock Mode Behavior**:
- No env vars needed (VITE_SUPABASE_URL, VITE_STRIPE_PUBLISHABLE_KEY)
- All API calls simulated with realistic delays
- State persisted in localStorage
- Perfect for development without cloud infrastructure

#### Pattern Detection

**`passive-detection.ts`** - Core algorithms
1. **normalizeIntent(text)** - Strip filler, extract action+object
2. **categorizeIntent(text)** - Classify into 8 categories
3. **calculateIntentConfidence(text)** - Score 0-1 based on:
   - Commitment language ("absolutely must" vs "maybe")
   - Action verbs (start, finish, quit, begin)
   - Temporal signals (today, week, ASAP)
   - Text length (longer = more deliberate)
4. **processingNewSignal()** - Cluster with existing patterns using Jaccard similarity
5. **shouldPromptCommitment()** - Check urgency threshold

---

### 2. Backend (Supabase Edge Functions + PostgreSQL)

#### Edge Functions (Deno Runtime)

**`analyze_intent/index.ts`** - AI Intent Analysis
- Input: user text (e.g., "I want to work out more")
- Process: Send to Claude/OpenAI with system prompt
- Output: Structured intent (category, goal, first_action, reflection)
- Used in: Capture flow (explicit intent creation)

**`process_intent_signal/index.ts`** - Passive signal processing
- Input: New intent signal from Detection page
- Process: Normalize → Categorize → Score confidence
- Output: Pattern created or updated
- Effect: Adds to intentPatterns in context

**`get_active_patterns/index.ts`** - Pattern retrieval
- Query: All patterns where status = 'active'
- Filtering: Optionally by category or urgency
- Used by: Detection page for display

**`create_stake_intent/index.ts`** - Credit Purchase (Stripe)
- Input: Credit amount ($), userId
- Process: Create Stripe PaymentIntent
- Output: client_secret, payment_intent_id
- Effect: Holds funds, not yet captured
- Used by: Credits page purchase flow

**`confirm_credit_purchase/index.ts`** - Credit Confirmation
- Input: payment_intent_id, userId, creditAmount
- Process: Verify Stripe PaymentIntent succeeded
- Output: Update user.credit_balance, create creditTransaction
- Effect: Credits added to user account
- Trigger: Stripe webhook (success) or manual call

**`complete_commitment/index.ts`** - Commitment Completion
- Input: commitment_id
- Process: Check refundOnCompletion flag
- Output: Update status to 'completed'
- Effect: If refund enabled, add creditTransaction with type='refund'
- Used by: Dashboard (Manual mark-complete button)

**`fail_commitment/index.ts`** - Commitment Failure
- Input: commitment_id
- Process: Check if already failed or completed
- Output: Update status to 'missed'
- Effect: Credits already spent (no new deduction)
- Trigger: Daily cron job (sweep_overdue_commitments)

**`sweep_overdue_commitments/index.ts`** - Daily Cron Job
- Trigger: Scheduled daily (e.g., 11 PM)
- Process: Query status='active' AND scheduled_at < now()
- Action: Call fail_commitment for each overdue
- Auth: Protected by x-sweep-secret header + SERVICE_ROLE_KEY
- Mockable: Admin page can trigger manually for testing

---

### 3. Database Schema (Drizzle ORM)

**`users` table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  creditBalance INT DEFAULT 500,  -- Credits, not currency
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP
);
```

**`creditTransactions` table**
```sql
CREATE TABLE creditTransactions (
  id UUID PRIMARY KEY,
  userId UUID FOREIGN KEY,
  type 'purchase' | 'spend' | 'refund',
  amount INT,
  balanceAfter INT,
  description VARCHAR,
  stripePaymentIntentId VARCHAR (optional),
  relatedCommitmentId UUID (optional),
  createdAt TIMESTAMP DEFAULT now()
);
```

**`commitments` table**
```sql
CREATE TABLE commitments (
  id UUID PRIMARY KEY,
  userId UUID FOREIGN KEY,
  intentId UUID FOREIGN KEY,
  creditsCost INT,  -- Changed from stakeAmount
  consequenceType 'money' | 'social' | 'escalate',
  scheduledDate TIMESTAMP,
  status 'scheduled' | 'completed' | 'missed',
  refundOnCompletion BOOLEAN DEFAULT false,
  stripePaymentIntentId VARCHAR (optional),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

**`intentPatterns` table**
```sql
CREATE TABLE intentPatterns (
  id UUID PRIMARY KEY,
  userId UUID FOREIGN KEY,
  normalizedIntent VARCHAR,
  category VARCHAR,
  firstDetectedAt TIMESTAMP,
  lastDetectedAt TIMESTAMP,
  occurrenceCount INT,
  daySpan INT,
  status 'active' | 'dismissed' | 'locked',
  suggestedStake INT,
  relatedSignalIds UUID[] -- Array of signal IDs
);
```

**`intentSignals` table**
```sql
CREATE TABLE intentSignals (
  id UUID PRIMARY KEY,
  userId UUID FOREIGN KEY,
  sourceType 'manual' | 'voice_note' | 'message' | 'journal' | 'calendar',
  rawText TEXT,
  detectedAt TIMESTAMP,
  normalizedIntent VARCHAR,
  category VARCHAR,
  confidence DECIMAL,
  processed BOOLEAN,
  createdAt TIMESTAMP
);
```

---

## Data Flows

### Flow 1: Passive Detection → Pattern Detection → Lock-In

```
User Action: Voice Note
    "I really need to start working out"
         ↓
    Detection Page / captureSignal()
         ↓
    1. Normalize
       Input: "I really need to start working out"
       Output: "start working out"
    2. Categorize
       Output: "fitness"
    3. Confidence Score
       Output: 0.85 (commitment language + action verb)
    4. Cluster Check
       Is there a similar pattern? No → Create new IntentSignal
    5. Check Urgency
       Mentions: 1
       Days: 1
       Status: LOW (not ready to prompt yet)
         ↓
    Stored in: intentSignals array + IntentSignal table
    
[Next Day - Same User]

User Action: Text to Friend
    "Should probably start going to the gym three times a week"
         ↓
    Detection Page / captureSignal()
         ↓
    1-4. Same as above
    5. Cluster Check
       Similar intent found: "start working out"
       Update pattern: occurrenceCount = 2
    6. Check Urgency
       Mentions: 2
       Days spanned: 1-2
       Status: HIGH ✓ Ready to prompt!
         ↓
    Pattern created/updated:
    {
      id: "pattern_123",
      normalizedIntent: "start working out",
      category: "fitness",
      occurrenceCount: 2,
      daySpan: 1,
      suggestedStake: 50,
      status: "active"  // Display to user!
    }
         ↓
    User sees Pattern Card on Detection page
         ↓
    User clicks "Lock In"
         ↓
    Taken to Lock-In Flow (with pattern pre-filled)
         ↓
    User confirms:
      - Deadline: 14 days
      - Refund: Yes
      - Credits: 50
    Click "Lock In"
         ↓
    1. createCommitment() called
    2. Deduct credits: 500 - 50 = 450
    3. Create Commitment record:
       {
         id: "commit_456",
         intentId: "pattern_123",
         creditsCost: 50,
         scheduledDate: now + 14 days,
         refundOnCompletion: true,
         status: "active"
       }
    4. Redirect to Dashboard
         ↓
    Dashboard shows new commitment in "Active" section
```

### Flow 2: Deadline Reached → Cron Job Checks → Missed/Completed

**Option A: User Completes (Manual)**
```
User on Dashboard
    Sees commitment: "Start Working Out" (14 days ago)
         ↓
    Clicks "Mark Complete"
         ↓
    completeCommitment() called
    1. Update status: "completed"
    2. Check refundOnCompletion flag: true
    3. Create creditTransaction:
       { type: 'refund', amount: 50, balanceAfter: 500 }
    4. Update user.creditBalance: 500
         ↓
    Dashboard moves commitment to "Completed"
    User sees celebration screen
    Credit balance updated in header badge
```

**Option B: Deadline Passes (Cron Job)**
```
[Daily at 11 PM] sweep_overdue_commitments Edge Function runs
    1. Query: SELECT * FROM commitments 
              WHERE status = 'active' AND scheduledDate < now()
    2. For each overdue commitment:
       a. Call fail_commitment(commitmentId)
       b. Update status: "missed"
       c. Log in creditTransactions (optional)
    3. Return summary: "2 commitments marked as missed"
         ↓
    User logs in next day
    Sees commitment moved to "Missed" section
    Reflection prompt: "What went wrong?"
         ↓
    [In production] Stripe charge captured automatically
         (In mock) Credits already deducted upfront
```

### Flow 3: Credit Purchase

```
User on Credits page
    Sees packages:
      100 credits - $9.99
      250 credits - $19.99
      500 credits - $34.99
      1000 credits - $59.99
         ↓
    Clicks "Buy 250 Credits"
         ↓
    Modal opens: CardElement (Stripe)
         ↓
    User enters card details
         ↓
    System calls create_stake_intent Edge Function
    Input: { amount: 1999, credits: 250, userId: "user_123" }
    
    create_stake_intent() calls Stripe:
    stripe.paymentIntents.create({
      amount: 1999,  // Cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { userId, credits: 250 }
    })
         ↓
    Returns: { client_secret, payment_intent_id }
         ↓
    Frontend calls stripe.confirmCardPayment(client_secret)
         ↓
    Stripe returns: success or error
         ↓
    If success:
       1. Frontend calls confirm_credit_purchase Edge Function
       2. confirm_credit_purchase verifies Stripe PaymentIntent
       3. Updates user.creditBalance: 500 + 250 = 750
       4. Creates creditTransaction:
          {
            type: 'purchase',
            amount: 250,
            balanceAfter: 750,
            stripePaymentIntentId: "pi_..."
          }
       5. Returns: { success: true }
          ↓
       6. Frontend shows confirmation
       7. Redirects to dashboard
       8. Credit balance badge updates: 500 → 750
         ↓
    If error:
       Show error message
       User can retry
```

---

## Urgency Calculation Logic

The system categorizes patterns into 3 urgency tiers:

```javascript
function calculateUrgency(pattern) {
  const mentionsPerDay = pattern.occurrenceCount / pattern.daySpan;
  
  // URGENT: High frequency
  if (pattern.occurrenceCount >= 5 || mentionsPerDay >= 1) {
    return "URGENT";  // 🔴 Immediate action recommended
  }
  
  // HIGH: Moderate frequency
  if (pattern.occurrenceCount >= 3 || mentionsPerDay >= 0.5) {
    return "HIGH";  // 🟠 Worth committing to
  }
  
  // MODERATE: Low frequency
  if (pattern.occurrenceCount >= 2) {
    return "MODERATE";  // 🟡 Consider it
  }
  
  // Not yet a pattern
  return "LOW";  // No badge shown
}
```

**Examples**:
- "Call mom" - 2 mentions over 1 day = 2/day → **URGENT** ✓
- "Work out" - 2 mentions over 3 days = 0.67/day → **HIGH** ✓
- "Learn Spanish" - 2 mentions over 7 days = 0.29/day → **MODERATE** ⚠️
- "Meditate" - 1 mention over 2 days = 0.5/day → **HIGH** (edge case) ✓

---

## Credit Economics

### How Pricing Works

**Base Tier**: $5-10 stake → 10-10 credits
**Growth**: Each $10 increase → 10 more credits
```
$5-10    → 10 credits    (1.0x)
$10-20   → 20 credits    (1.0x)
$20-50   → 50 credits    (1.0x)
$50-100  → 100 credits   (1.0x)
$100-500 → 200 credits   (0.4x) ← Bulk discount!
```

### Purchase Packages (with bulk savings)

```
100 credits  @ $9.99    = 10.0¢ per credit (baseline)
250 credits  @ $19.99   = 8.0¢ per credit  (20% savings)
500 credits  @ $34.99   = 7.0¢ per credit  (30% savings)
1000 credits @ $59.99   = 6.0¢ per credit  (40% savings)
```

### User's Perspective

**Casual User** (1-2 commitments per month)
- Buys 100 credits for $9.99
- Averages $20-30 stake per commitment = 20-30 credits
- 100 credits lasts 3-5 months
- Annual cost: ~$25 (vs subscription model)

**Power User** (10+ commitments per month)
- Buys 1000 credits for $59.99
- Averages $40-50 stake per commitment = 40-50 credits
- 1000 credits lasts 2-3 months
- Annual cost: ~$250-400 (but 6¢/credit = better value)

**The Hook**: Bulk discounts incentivize committed users to buy more upfront, improving LTV and retention.

---

## Security Considerations

### Frontend (Client)
- ✅ Mock mode works without credentials
- ✅ Stripe publishable key (safe to expose)
- ✅ No database credentials in client code
- ⚠️ localStorage used for demo persistence (not sensitive data)

### Backend (Edge Functions)
- ✅ SERVICE_ROLE_KEY for admin operations (cron jobs)
- ✅ User auth via Supabase JWT in Authorization header
- ✅ Stripe secret key never exposed to client
- ✅ Payment intent metadata includes userId for verification
- ✅ Rate limiting on cron job endpoint (x-sweep-secret header)
- ✅ Input validation on all Edge Function parameters

### Database
- ✅ RLS (Row Level Security) on intentPatterns, commitments
- ✅ Users can only see/modify their own data
- ✅ Migrations use Drizzle (type-safe SQL generation)
- ⚠️ Production: Enable encryption at rest for creditTransactions

---

## Monitoring & Analytics

### Key Metrics

**User Engagement**
- Active patterns (per user, per day)
- Pattern → Commitment conversion rate (should be 50%+)
- Commitment completion rate (target: 70%+)
- Average stake per commitment (trend over time)

**Credit Economics**
- Average credits purchased per user
- Lifetime value (LTV) by cohort
- Refund rate (how many people enable refundOnCompletion)
- Churn: 30 days without purchase = churned

**Pattern Detection Accuracy**
- Signal → Pattern promotion rate (hits 3+ mentions)
- Urgency score calibration (URGENT patterns should have 80%+ completion)
- Category accuracy (user edits after AI categorization)
- Confidence score distribution (modal at 0.85?)

**System Health**
- Edge Function latency (analyze_intent SLA: <2s)
- Cron job success rate (sweep_overdue_commitments)
- Stripe webhook delivery rate (should be 99.9%+)
- Database query performance (< 100ms for pattern queries)

---

## Deployment Checklist

**Before Going Live**:
- [ ] Database migrations applied (`pnpm db:push`)
- [ ] Edge Functions deployed (`supabase functions deploy <name>`)
- [ ] Stripe live keys configured (Publishable + Secret)
- [ ] Stripe webhook endpoint created (Vercel URL)
- [ ] Environment variables set in Vercel + Supabase dashboards
- [ ] Input source integrations enabled (optional at launch)
- [ ] Sentry error tracking configured
- [ ] Analytics tracking (Mixpanel/Amplitude) integrated
- [ ] Email service configured (for receipts, reminders)
- [ ] Rate limiting on cron endpoint verified

**Post-Launch**:
- [ ] Monitor error logs daily first week
- [ ] Watch conversion metrics (Free → Paid)
- [ ] A/B test package pricing
- [ ] Refine urgency thresholds based on completion data
- [ ] Add push notifications for URGENT patterns
- [ ] Launch input source integrations (voice, calendar, SMS)

---

## Why This Architecture Wins

1. **Zero-Friction Onboarding**
   - No upfront commitment needed
   - Just capture your thoughts
   - System detects patterns automatically

2. **Real Money Creates Real Results**
   - $25 stake → 66% completion vs 10% base rate
   - Loss aversion is 2x more powerful than gain seeking
   - Credits pre-purchased = psychological "sunk cost"

3. **Passive Detection Differentiator**
   - Not just another to-do app
   - Captures where you actually think (voice, messages, calendar)
   - Everyone has 10x more casual thoughts than formal plans

4. **Scalable Economics**
   - Per-user marginal cost: ~$0 (pure software)
   - 70% of revenue → company after payment processing
   - High LTV for power users (annual $200+)

5. **Network Optionality**
   - Private by default (only your patterns)
   - Could add friend challenges / leaderboards later
   - Could add shared commitments / accountability partners

---

**This is the north star: Turn casual thinking into intentional action, backed by real money.** 🚀
