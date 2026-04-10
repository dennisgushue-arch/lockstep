# Recovery System Manual Test Walkthrough

## 1. Trigger Critical Recovery
- Set user integrity score to 20 (simulate via localStorage or mock)
- Go to `/dashboard` and `/missed`
- **Expected:**
  - Recovery card appears at top
  - Headline: "Recovery Required"
  - Instruction: "You need a clean win immediately."
  - Next action: "Do one small task within the next 2–3 hours."
  - Deadline hint: "Same-day only"

## 2. Trigger Fragile Recovery
- Set user integrity score to 40
- Go to `/dashboard` and `/missed`
- **Expected:**
  - Recovery card appears at top
  - Headline: "Stabilize Your Pattern"
  - Instruction: "Do not take on anything large right now."
  - Next action: "Complete one small, clearly defined task today."
  - Deadline hint: "Today"

## 3. Normal State
- Set user integrity score to 75
- Go to `/dashboard` and `/missed`
- **Expected:**
  - No recovery card shown

## 4. Pact Creation in Recovery
- With score < 50, create a new pact
- **Expected:**
  - Pact is forced to small/fast (2–3 hour or today deadline)
  - Reflection text includes recovery instruction

## 5. Mobile UI
- View recovery card on mobile
- **Expected:**
  - Card is compact, readable, and visually distinct

## 6. Result Screen
- Fail a pact
- **Expected:**
  - Recovery card appears after miss message

---

**If all above pass, recovery system is working as designed!**
