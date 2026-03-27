# Lockstep: Psychology Realignment

## What Changed

The entire Lockstep UI now reflects its **core psychological positioning**: radical honesty, loss-driven motivation, and identity-shifting language—instead of soft encouragement.

### Before → After

| Page/Component | Before | After |
|---|---|---|
| **Landing Hero** | "Stop saying 'I should'" | "Stop saying 'I should'" + "You're lying to yourself" |
| **Landing CTA** | "LOCK YOUR FIRST INTENT — FREE" | "PROVE YOU MEAN IT" |
| **Capture Heading** | "DECLARE YOUR INTENT" | "SAY IT OUT LOUD" |
| **Capture Subheading** | "What is the one thing you must do?" | "What are you actually going to do? (Or stop pretending.)" |
| **Capture Button** | "ANALYZE" | "NEXT" |
| **Passive Detection Modal Title** | "Time to Commit?" | "Stop Saying It. Do It." |
| **Modal Color Scheme** | Blue (safe) | Red (consequences) |
| **Modal Stake Label** | "Suggested stake" | "Stake at risk" |
| **Modal Dismiss Button** | "Dismiss" | "Keep Saying It" |
| **Modal Confirm Button** | "Lock It In" | "I Mean It" |
| **Modal Copy** | "Let's lock this in" | "You've said this X times. No commitment. No skin in the game. If it matters, prove it. If it doesn't, stop saying it." |
| **Reflection Button** | "LOCK IT IN" (white) | "STAKE IT" (red) |
| **Missed Page Title** | "COMMITMENT MISSED" | "YOU DIDN'T DO IT." |
| **Missed Page Message** | "You said you would act. You didn't." | "The deadline passed. You're still here. It's done." |
| **Missed Card Title** | "Delay was a decision." | "What You Said vs. What You Did" |
| **Missed Card Copy** | "Your stake has been transferred..." | "You locked in a commitment. Then you didn't follow through. That's not a judgment. That's a fact. Your stake has been charged. The money is gone." |
| **Settings Intro** | "Your privacy matters." | "This monitors your typing." |
| **Settings Rules Heading** | "Detection Rules" (blue) | "When We'll Call You Out" (red) |
| **Landing Problem Section** | "Willpower is finite..." | "You say you'll do something. You don't. Every app lets you fail quietly. Lockstep is for people ready to stop lying." |

---

## Psychology Shifts Embedded in Copy

### 1. **From Motivation → Loss Aversion**
- Remove: "Build habits", "Stay motivated", "You'll do better next time"
- Add: "Your stake has been charged", "The money is gone", "You didn't do it"
- Mechanism: Pain of loss (losing $10) > pleasure of gain (earning a badge)

### 2. **From Encouragement → Mirror**
- Remove: "Great try!", "You're doing amazing", "Keep going!"
- Add: "You're lying to yourself", "Stop saying it", "That's a fact"
- Mechanism: Uncomfortable honesty forces identity change

### 3. **From Optional → Consequential**
- Remove: "Suggest", "Try", "Consider locking in"
- Add: "Stop Saying It. Do It.", "I Mean It", "Prove it"
- Mechanism: Binary choice forces commitment, no middle ground

### 4. **From Soft Colors → Red (Danger) Aesthetics**
- Changed button backgrounds to red where money is at stake
- Changed modal backgrounds from blue to red
- Changed confirmation text color from encouraging to stark
- Mechanism: Red triggers loss/danger response in brain

### 5. **Identity Language**
- Copy that reinforces: "I'm someone who does what I say"
- Instead of: "I'm someone who's trying to be better"
- Mechanism: Identity-level change sticks longer than behavior change

---

## Copy Principles Applied

### Principle 1: Radical Honesty
```
❌ "Let's lock this in"
✅ "If it matters, prove it. If it doesn't, stop saying it."

❌ "Gentle encouragement text"
✅ "You've said this 3 times. No commitment. No skin in the game."
```

### Principle 2: No Soft Language
```
❌ "You said you would act"
✅ "YOU DIDN'T DO IT."

❌ "Your stake has been transferred"
✅ "The money is gone."
```

### Principle 3: Binary Choice (Not Soft Middle)
```
❌ "Dismiss" (easy escape)
✅ "Keep Saying It" (forces you to own the avoidance)

AND

❌ "Lock It In" (vague)
✅ "I Mean It" (identity commitment)
```

### Principle 4: Consequence = Reality
```
❌ "Charge your card later"
✅ "Your stake has been charged" (present tense, done)

❌ "Transfer to charity"
✅ "The money is gone" (no redemption narrative)
```

---

## Pages Updated

1. **Landing Page** (`client/src/pages/landing.tsx`)
   - Hero text: "You're lying to yourself"
   - CTA: "PROVE YOU MEAN IT"
   - Problem section: Reframed failure model

2. **Capture Page** (`client/src/pages/capture.tsx`)
   - Heading: "SAY IT OUT LOUD"
   - Subheading: Ends with "(Or stop pretending.)"
   - Button: "NEXT" instead of "ANALYZE"

3. **Reflection Page** (`client/src/pages/reflection.tsx`)
   - Main button: "STAKE IT" with red background
   - Button text emphasizes financial commitment

4. **Missed/Failed Page** (`client/src/pages/missed.tsx`)
   - Title: "YOU DIDN'T DO IT."
   - Card color: Red background
   - Copy: "That's a fact."

5. **Settings Page** (`client/src/pages/settings.tsx`)
   - Intro: "This monitors your typing"
   - Section: "When We'll Call You Out"
   - Colors: Red for consequence sections

6. **Passive Intent Suggestion Modal** (`client/src/components/passive-intent-suggestion.tsx`)
   - Title: "Stop Saying It. Do It."
   - Color: Red theme
   - Buttons: "Keep Saying It" / "I Mean It"
   - Copy: Cuts through to core issue

---

## Design Cohesion

**Color semantics:**
- Red: Money, consequences, stakes, what's at risk
- White/Gray: Neutral information
- No more soft blues for "helpful" sections

**Typography:**
- Statements, not questions
- Present tense for consequences (already happened)
- Direct address ("You didn't do it" not "It wasn't completed")

**Interaction language:**
- "Dismiss" → "Keep Saying It" (owns the avoidance)
- "Lock It In" → "I Mean It" (personal commitment)
- "ANALYZE" → "NEXT" (no analysis, just move forward)

---

## Psychological Effect Chain

```
User sees: "You're lying to yourself"
↓
User feels: Discomfort (mirror effect)
↓
User chooses: "Prove it" or "Keep pretending"
↓
User who commits gets: Identity shift ("I'm honest with myself")
↓
User who failed gets: "YOU DIDN'T DO IT" (no escape narrative)
↓
Next time: Identity threat > motivation boost (neural anchoring)
```

---

## What Still Needs Building

Based on the psychology framework, these features would complete the system:

### 1. **Mandatory Failure Reflection**
When commitment misses: Modal asking "Why didn't you do this?"
- Required text answer (no skip)
- Answer stored permanently
- Shown on public profile (if enabled)
- Pattern detection: "You always miss when..."

### 2. **Public Accountability** (Opt-in)
- Users can make failures visible to chosen circle
- Creates reputation stake (social loss aversion)
- "I failed" becomes shareable fact

### 3. **Commitment Difficulty Tiers**
- Easy: $5, 7-day window, self-reported completion
- Medium: $20, 14-day, requires photo/proof
- Hard: $50+, 30-day, third-party verification

### 4. **Streak/Failure History**
- Public record: "5 commitments, 4 completed, 1 failed"
- Identity becomes: "Person who keeps promises" or "Serial failer"
- Creates reputation cost that motivates

### 5. **Challenge Mode**
- "30-Day Lockstep Challenge" 
- Multiple simultaneous commitments
- Public leaderboard (money at stake)
- Monthly themes ("Fitness March", "Writing April")

---

## Deployment

**Live at**: https://lockstep-pearl.vercel.app  
**Commit**: `845720b`  
**Date**: January 30, 2026

---

## Testing the Psychology

To verify this messaging works, watch for:

✅ Users who dismiss patterns are uncomfortable (that's the point)  
✅ Users who commit feel the weight of real money  
✅ Failed commitments trigger shame/honesty, not "try again"  
✅ Language changes identity language in their reflections  
✅ Higher completion rate than traditional motivation apps  

The app should feel **uncomfortable** to people not ready for it, and **powerful** to people who are.

---

# Comprehensive Psychology Realignment Guide

This section is the canonical reference for **why** the product uses hard-edged copy, **how** to apply it consistently, and **where** it must be constrained for safety, accessibility, and trust.

## Goals (Non-Negotiable)

1. **Truth over comfort**: The UI reflects reality, not reassurance.
2. **Consequences are explicit**: Loss is concrete, immediate, and plainly stated.
3. **Identity > motivation**: Language pushes identity-level decisions.
4. **Binary choice**: Remove middle-ground outs.
5. **Respect user autonomy**: No deception, no manipulation, no dark patterns.

## Target User & Fit

**This is not for everyone.** The product is intentionally polarizing:

- Best fit: users seeking direct accountability and willing to stake money.
- Poor fit: users wanting gentle coaching or gamification.

If a user says “this feels too harsh,” the system should **not** soften the product; it should help them exit without friction.

## Psychological Foundations (Short Form)

1. **Loss Aversion**: Losses weigh more than equivalent gains.
2. **Identity Commitment**: Actions follow identity statements.
3. **Cognitive Dissonance**: Inconsistency creates change pressure.
4. **Sunk Cost + Public Record**: Increases follow-through.
5. **Immediate Feedback**: Timely consequences are more effective.

These are **descriptive**, not prescriptive. We use them only to reflect choices users already made (e.g., staking money).

## Language Guide

### Voice Attributes

- **Direct**: One clause sentences.
- **Accurate**: Only say what is true.
- **Non-judgmental**: Facts, not moralizing.
- **Present tense**: The outcome has already occurred.

### Replace/Keep Matrix

| Replace | With | Reason |
|---|---|---|
| “Try” | “Do” | Removes optionality |
| “Maybe” | “Decide” | Forces commitment |
| “If you want” | “If you mean it” | Identity framing |
| “Great job!” | “You did it.” | Truth, not praise |
| “Don’t worry” | “It’s done.” | Consequence clarity |

### Formatting Rules

- **ALL CAPS** for consequences only.
- **Bold** for identity statements only.
- Avoid multiple exclamation points.
- Avoid sarcasm and mockery.

## UX Patterns (Where to Apply)

### 1) Commitment Moments
- Use direct, binary CTAs.
- Reveal stake amount in the same viewport.
- Ask for explicit confirmation: “I Mean It.”

### 2) Failure Moments
- Use blunt, present-tense statements.
- Show factual breakdown: “You said X. You did Y.”
- Don’t offer immediate re-commitment in the same view (avoid emotional reactivity).

### 3) Reflection Moments
- Prompt for concrete reasons and obstacles.
- Avoid “what went well” unless the commitment was completed.

### 4) Passive Detection
- Make detection transparent and controllable.
- Always show an **explain** link for why the modal appeared.

## Safety, Ethics & Trust

The product can be hard-edged without being harmful.

### Boundaries

- **No coercion**: Never imply threats beyond the stake.
- **No shaming**: “You didn’t do it” is factual; avoid “You are lazy.”
- **No deception**: No false scarcity, countdowns, or hidden fees.
- **No irreversible traps**: Always allow cancellation before a stake is locked.

### Mental Health Considerations

- Provide a **soft off-ramp**: “This isn’t for me” with a gentle exit.
- Avoid language that targets self-worth or diagnoses.
- Include a short **help** link in failure flows for users in distress.

## Accessibility Guidance

- Red is meaningful; **never rely on color alone**. Pair with text.
- Use accessible contrast ratios for red/white combinations.
- Provide clear focus states for high-pressure CTAs.
- Avoid flashing or aggressive animations in failure states.

## Localization Guidance

When localizing, maintain **directness** but avoid idioms that could become insulting. Replace literal phrases with culturally equivalent statements of consequence.

## Information Architecture

This system should appear consistently in:

- Landing
- Capture
- Passive Intent Modal
- Reflection
- Missed/Failure
- Settings/Privacy
- History (public or private)

If any surface deviates, the product feels inconsistent and loses credibility.

## Implementation Checklist

**Copy**
- [ ] Remove softeners (“maybe”, “try”, “encourage”)
- [ ] Ensure consequence statements are factual
- [ ] Use identity language only at commitment moments

**Design**
- [ ] Red reserved for stakes/failure only
- [ ] Neutral tones for informational content
- [ ] Strong typographic hierarchy for “fact” statements

**Behavior**
- [ ] Failure flow requires acknowledgment
- [ ] Reflection is required within 24 hours (configurable)
- [ ] Detection can be paused in Settings

## Measurement & Signals

Track outcomes that indicate **productive discomfort** rather than churn:

- **Commitment conversion rate** (post-modal)
- **Completion rate** vs. baseline
- **Re-commit rate after failure** (7–14 days)
- **Exit feedback**: “too harsh” should be common but not dominant

Avoid optimizing for vanity metrics like time-on-page in failure flows.

## QA Scenarios

1. **First-time user** sees intent modal → understands consequence.
2. **Failure** triggers → factual, not insulting.
3. **Cancel** before stake locked → immediate and respected.
4. **Accessibility**: high-contrast mode still conveys stakes.
5. **Localization**: language remains direct but not abusive.

## Anti-Patterns (Do Not Add)

- “You’re a failure.” (identity attack)
- “Do it or else.” (threat)
- Hidden fees or ambiguous stakes
- Forced sharing or forced social exposure
- Humor or sarcasm in failure moments

## FAQ

**Q: Why so harsh?**  
A: Because the product is about measurable stakes and truth. It reflects decisions the user already made.

**Q: Isn’t this shaming?**  
A: The language is factual and non-judgmental. It describes actions, not character.

**Q: Can we add positive reinforcement?**  
A: Only when completion is verified. Keep it factual: “You did it.”

**Q: What about legal/finance disclosures?**  
A: They must be clear, visible, and separate from persuasive copy.

## Versioning

- Maintain changes to this document alongside copy updates.
- Each copy change should map to a principle in this guide.

---

If a new feature doesn’t fit these principles, it should be redesigned or rejected.
