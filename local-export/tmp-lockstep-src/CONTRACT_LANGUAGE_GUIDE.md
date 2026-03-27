# LOCKSTEP PACT LANGUAGE GUIDE

This is the tone, voice, and microcopy standard for all user-facing copy. It transforms the app from "productivity tool" to "behavioral accountability device."

---

## Core Principles

1. **Never use**: task, goal, habit, reminder, achieve, track
2. **Always use**: intent, commitment, pact, stake, consequence, promise, honor, affirm
3. **Tone**: Serious, formal, direct, financial. Like signing a real pact.
4. **Perspective**: YOU did this. You own this. You set this consequence.

---

## Intent Capture Flow

### When User Enters Their Intent

**Their input:**
```
"I'm going to wake up at 6 and run"
```

### System Response (MIRRORS BACK + REFRAMES AS PACT)

❌ **BAD:**
> "Great! Exercise is important for your health. You're going to do amazing!"

✅ **GOOD:**
```
COMMITMENT ACCEPTED

You are committing to:
"Wake up at 6 AM and run before your day begins"

Your Stake: 10 credits
Consequence: [User selected]

This commitment activates immediately.
You will face your consequence if you break this.

—— SIGN HERE ——

I understand what I've committed to.
I understand what I lose if I fail.
```

---

## Completion Flow

### When User Clicks "HONOR PACT"

**Button label**: ✓ HONOR PACT (not "Complete", not "Finish")

**Toast message**:
```
✓ PACT HONORED

You kept your word. 
+10 credits earned.

Your integrity score increased to 47.
```

**State change**: 
- Red glow disappears
- Pact moves to history
- Stats update in real-time
- Visual celebration (optional: confetti, pulse, discharge)

---

## Failure Flow

### When User Clicks "⚡ BREAK PACT"

**Button label**: ⚡ BREAK PACT (not "Fail", not "Delete")

**Toast message**:
```
Consequence Applied

You set this. It has been applied.
-10 credits deducted.

You are now: 47/57 integrity score
```

**Tone notes**:
- NO shame or blame
- NO "better luck next time"
- Just facts: "You set this. It's done."
- Mirrors user's own language back to them

---

## Overdue/Auto-Fail Flow

### When System Auto-Triggers Consequence

**Toast**:
```
Consequence Activated

Your commitment to "Wake up at 6 AM and run"
expired 2 hours ago.

You set this consequence.
-10 credits applied.
```

**Direction**: Redirect to `/history` to see the ledger update

---

## Dashboard Copy

| Element | Current | Corrected |
|---------|---------|-----------|
| Button | + NEW INTENT | + NEW PACT |
| Section title | Commitments | Your Pacts |
| Section title | Current Promise | Your Commitment |
| Badge (complete) | COMPLETE | HONORED |
| Badge (failed) | MISSED | FAILED |
| Stats label | Level | Integrity Score |
| Subheader | Your stakes. Your word. No excuses | Your stakes. Your word. No compromises |
| Countdown label | Pressure Building | CONSEQUENCE COUNTDOWN |
| Countdown text | until consequence triggers | until you face what you set |
| Action: complete | ✓ COMPLETE | ✓ HONOR PACT |
| Action: check-in | 💬 CHECK-IN | 🔄 REAFFIRM |
| Action: fail | ⚡ FAIL | ⚡ BREAK PACT |
| Empty state | Select a commitment | Select a pact to view details |

---

## History/Ledger Copy

**Page title**: YOUR RECORD (not "History", not "Dashboard")

**Subtitle**: A ledger of your integrity

**Stats labels**:
- Integrity Score: "Total pacts honored"
- Honor Rate: "X% of your pacts"
- Credits Earned: "From completed pacts"
- Credits Lost: "From broken pacts"

**Pact entry status**:
- Honored: ✓ HONORED
- Failed: ✗ FAILED
- Active: ACTIVE (in countdown)

**CTA text**:
```
This ledger is proof.

Every pact you honor builds your 
integrity score. Every one you break diminishes it.

You are what you do when nobody is watching.
```

---

## When System Paraphrases User Intent

The system should:

1. **Mirror exact language** back to the user
2. **Add specificity** (time, action, context)
3. **Speak in formal tone** (like a legal document)
4. **Show understanding** of the commitment type

### Examples

**User enters:**
```
"I'm going to meditate"
```

**System responds:**
```
COMMITMENT ACCEPTED

You are committing to:
"Meditate for at least 10 minutes"

Your Stake: 5 credits
Consequence: Donate $5 to charity

This pact is binding.
```

---

**User enters:**
```
"Run 5k without stopping"
```

**System responds:**
```
COMMITMENT ACCEPTED

You are committing to:
"Complete a 5 kilometer run 
without stopping to walk"

Your Stake: 15 credits
Consequence: Lose $15 to consequence

This is a serious commitment.
```

---

## Tone in One Sentence

**Lockstep sounds like**: A financial trader's terminal for your promises.

**It does NOT sound like**: A cheerleader or a motivational speaker.

---

## Why This Works

1. **Identity shift**: User moves from "trying to be productive" → "entering a financial pact"
2. **Loss aversion**: Credits are real. Stakes matter.
3. **Commitment bias**: Writing it down formally increases follow-through
4. **Accountability**: Mirror language removes excuses
5. **Seriousness**: No cute emoji, no "you got this!" Feels important.

---

## Red Flags (Never Do This)

❌ "You're doing great!"
❌ "Keep crushing it!"
❌ "One step closer to your goals!"
❌ "You can do this!"
❌ "Awesome job!"
❌ "Your goals are important"
❌ "Let's get it!"

✅ Instead: Acknowledge the fact. "You honored the pact."

---

## Implementation Checklist

- [ ] All button labels use pact language
- [ ] All toasts use mirror + financial language
- [ ] Dashboard calls it "pacts" not "commitments"
- [ ] Failure feedback says "You set this"
- [ ] No emojis except in buttons (Zap, Check, X)
- [ ] Stats show "Integrity Score" not "Level"
- [ ] History page is called "YOUR RECORD"
- [ ] Intent capture paraphrases back formally
- [ ] System messages feel like legal documents
- [ ] Never blame-shame. Only facts.
