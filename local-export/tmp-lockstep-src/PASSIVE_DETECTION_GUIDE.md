# Passive Intent Detection - User Guide

## How It Works

The Lockstep app can now **automatically detect your intentions** based on your typing patterns, if you opt in.

### What Gets Detected?

When enabled, passive detection monitors:
- **Sustained typing** (30+ seconds of continuous writing)
- **Intent patterns** (50+ characters, 10+ words)
- **Repeated mentions** (same goal mentioned 3+ times over days/weeks)

### Privacy

The keystroke monitor is **browser-only** and only:
- ✓ Monitors text you type in the app
- ✓ Tracks typing session duration and length
- ✓ Never sends keystroke data to external services
- ✓ Excludes password fields automatically
- ✗ Does NOT monitor text outside this app
- ✗ Does NOT access other applications
- ✗ Does NOT send raw keystroke data anywhere

## Getting Started

### 1. Enable Passive Detection

Go to **Settings** (gear icon in top-right navigation):

```
Settings → Passive Intent Detection → Toggle ON
```

You'll see:
- What we monitor
- What we don't monitor  
- Detection rules and thresholds

### 2. Type Naturally

Start typing in the app like normal. When you've typed for 30+ seconds on something substantial, it's captured as a "signal."

**Example scenarios:**
- Writing a detailed commitment reflection
- Typing out a journal entry about what you want to accomplish
- Describing a goal in detail

### 3. Get Suggestions

When you mention the same goal **3+ times** over time, a **"Time to Commit?"** modal appears:

```
┌─────────────────────────────────┐
│ 🌟 Time to Commit?              │
│ You've mentioned this 3 times    │
│ over 5 days.                    │
│                                 │
│ "go to the gym"                 │
│ Category: fitness               │
│ Suggested stake: $10            │
│                                 │
│ [Dismiss] [Lock It In]          │
└─────────────────────────────────┘
```

You can:
- **Lock It In**: Create a full commitment with the suggested parameters
- **Dismiss**: Mark as not-ready (won't suggest again immediately)

## Detection Thresholds

The app triggers a suggestion when:

| Scenario | Condition | Urgency |
|----------|-----------|---------|
| Daily mentions | 5+ times in 7 days | HIGH 🔴 |
| Weekly mentions | 4+ times in 14 days | MEDIUM 🟡 |
| Persistent mentions | 3+ times in 21 days | LOW 🟢 |

## Disabling Passive Detection

1. Go to **Settings**
2. Toggle **OFF** → Keystroke monitor stops immediately
3. All existing signals/patterns are preserved
4. Re-enable anytime by toggling back **ON**

## Examples

### Example 1: Fitness Goal
```
Day 1: "Really need to start working out"  → Signal captured
Day 3: "Should go to gym 3x per week"      → Signal captured
Day 5: "Thinking about getting fit"        → Signal captured

→ Suggestion appears: "go to the gym" pattern detected
→ User clicks "Lock It In"
→ Commitment created with $10 stake
```

### Example 2: Work Project
```
Day 1: Writes detailed plan in reflection → Signal captured
Day 8: Types "Should finally launch this" → Signal captured
Day 10: Mentions project in journal       → Signal captured

→ Suggestion appears after 3 mentions
→ User accepts: creates commitment
```

## Technical Details

### What Counts as a "Session"?
- Typing must last 30+ seconds
- Minimum 50 characters
- Minimum 10 words
- 3+ seconds of inactivity = session ends

### How Patterns Match?
- Similar intents are grouped (fuzzy matching on normalized text)
- Pattern tracks: first mention, last mention, total count, time span
- Confidence scored 0-1 based on intent language strength

### Where is Data Stored?
- Mock mode: Browser localStorage only
- Production: Supabase database (user-scoped)
- No third-party services access keystroke data

## Keyboard Shortcuts

Currently none, but coming soon:
- `Cmd/Ctrl + Shift + L` - Quick "Lock It In"
- `Cmd/Ctrl + Shift + D` - Dismiss current suggestion

## FAQ

**Q: Can I exclude certain fields from monitoring?**  
A: Yes! Add `data-no-monitor` attribute to any HTML element to skip monitoring.

```html
<textarea data-no-monitor></textarea>
```

**Q: What if I don't want certain text analyzed?**  
A: You can manually clear the keystroke history in the detection debug panel.

**Q: Does this work if I'm offline?**  
A: Yes! Detection happens locally in your browser. Results sync when online.

**Q: Can I see all my detected patterns?**  
A: Yes! Go to **Detection** page to see all active patterns, signals, and manage them.

**Q: What if a pattern is wrong?**  
A: Click **Dismiss** to hide it, or go to Detection page to delete specific signals.

---

**Deployed at**: https://lockstep-pearl.vercel.app  
**Last updated**: January 30, 2026
