# Recovery System Verification Notes

## Test Coverage: Recovery System Implementation

### Integrity Score Ranges & Recovery Plans

| Score | Identity | Recovery Mode | Treatment |
|-------|----------|---------------|-----------|
| 25 | critical | rebuild | 2-3 hour deadline, tiny pact |
| 40 | fragile | stabilize | end-of-day deadline, small pact |
| 60 | unstable | none | standard deadline, standard pact |
| 75 | solid | none | adaptive deadline, adaptive pact |
| 85 | reliable | none | normal deadline, normal pact |
| 95 | iron | none | expanded pact allowed |

### Implementation Verification

✅ **Build Success**: Full production build completed without errors
✅ **Type Safety**: Recovery system types correctly imported and used
✅ **Integration Points**:
1. `client/src/lib/mock-data.tsx` - AI analysis flow
2. `client/src/lib/identity-recovery.ts` - Recovery plan logic
3. `client/src/lib/integrity-identity.ts` - Identity calculation
4. `client/src/lib/adaptive-pact-size.ts` - Pact sizing (already integrated)

### Recovery System Behavior

When a user with **low integrity (< 50)** creates a new intent:

```
1. AI Analysis triggered
   ↓
2. Integrity score calculated (< 50)
   ↓
3. getRecoveryPlan() returns appropriate mode:
   - "critical" (< 30): rebuild mode
   - "fragile" (30-50): stabilize mode
   - "none" (>= 50): normal mode
   ↓
4. If recovery mode active:
   a) Reflection enhanced: "RECOVERY MODE: [instruction]"
   b) Deadline overridden:
      - "Same-day only" → 2-3 hours from now
      - "Today" → end of day (23:59:59)
   c) Pact size already reduced via calculateAdaptivePactSize()
   d) Console log: [Mock Supabase] Recovery plan applied
   ↓
5. User sees recovery-guided pact suggestion on capture/reflection pages
   ↓
6. Next action is designed for immediate win (same-day or few-hour commitment)
```

### Testing the Recovery System

To test manually:

1. **Set Low Integrity Score in Mock Mode**:
   - Open browser DevTools → Application → LocalStorage
   - Create a commitment, then manually edit user stats to have integrity < 50

2. **Create a New Intent**:
   - Navigate to `/capture` page
   - Enter an intent text
   - Watch console for: `[Mock Supabase] Recovery plan applied`
   - Check that reflection includes "RECOVERY MODE"
   - Verify deadline is 2-3 hours away (instead of adaptive default)

3. **Verify Pact Size**:
   - Check that `pact_size_level` is "tiny" or "small"
   - Confirm `pact_size_reason` mentions recovery state

### Key Design Decisions

- **Non-Breaking**: Recovery system only activates when integrity < 50
- **Layered**: Works with adaptive pact sizing (not replacing it)
- **User-Facing**: Recovery instructions appear in reflection text
- **Dev-Friendly**: Console logs all recovery plan application
- **Deadline Override**: Only applies if recovery deadline is MORE aggressive
- **Immediate Action**: "Same-day only" deadlines (2-3 hours) to build momentum

### Future Enhancements

- [ ] Show recovery plan in UI card on capture page
- [ ] Add recovery streak counter (consecutive same-day completions)
- [ ] Progressive relaxation as recovery mode progresses
- [ ] Email notifications for recovery deadlines (24/48 hour range)
