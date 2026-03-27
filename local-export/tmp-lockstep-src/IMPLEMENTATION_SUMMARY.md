# User Stats Implementation Summary

## Overview
Successfully implemented user statistics tracking for commitment lifecycle events with the following components:

## 1. Database Schema (✅ Complete)
**File:** `supabase/migrations/002_user_stats_table.sql`

Created `user_stats` table with the following features:
- **Commitment Stats**: Total created, completed, and failed commitments
- **Streak Tracking**: Current streak and longest streak
- **Credit Stats**: Total spent, earned, and refunded credits
- **Timing**: Tracks last commitment, completion, and failure timestamps
- **Perks**: JSON field for future optional switches/perks
- **RLS Policies**: Row-level security for user privacy
- **Auto-initialization**: Trigger to create stats when a user is created
- **Helper Function**: `initialize_user_stats()` for manual initialization

### Default Values
All stats initialize to "0" (stored as TEXT for consistency with existing schema):
- `total_commitments_created: "0"`
- `total_commitments_completed: "0"`
- `total_commitments_failed: "0"`
- `current_streak: "0"`
- `longest_streak: "0"`
- `total_credits_spent: "0"`
- `total_credits_earned: "0"`
- `total_credits_refunded: "0"`
- `perks: "{}"`

---

## 2. Shared Utilities (✅ Complete)
**File:** `supabase/functions/_shared/user-stats.ts`

Created three core handler functions:

### `handleCommitmentCompleted(supabase, userId, commitmentId, creditsRefunded)`
**Called when:** A commitment is successfully completed
**Updates:**
- Increments `total_commitments_completed`
- Increments `current_streak`
- Updates `longest_streak` if current streak exceeds it
- Adds to `total_credits_refunded` (if applicable)
- Sets `last_completion_at` timestamp
- Updates `updated_at` timestamp

### `handleCommitmentFailed(supabase, userId, commitmentId)`
**Called when:** A commitment fails (missed deadline or manual failure)
**Updates:**
- Increments `total_commitments_failed`
- **Resets `current_streak` to "0"**
- Sets `last_failure_at` timestamp
- Updates `updated_at` timestamp

### `validateNewCommitment(supabase, userId, creditsCost, scheduledDate)`
**Called when:** Creating a new commitment
**Validates:**
- User has sufficient credits
- Scheduled date is in the future
- User exists in database

**Updates on success:**
- Increments `total_commitments_created`
- Adds to `total_credits_spent`
- Sets `last_commitment_at` timestamp
- Updates `updated_at` timestamp

**Returns:** `{ valid: boolean, error?: string }`

---

## 3. Edge Functions Updated (✅ Complete)

### `complete_commitment/index.ts`
**Changes:**
- ✅ Import `handleCommitmentCompleted` from shared utilities
- ✅ Call `handleCommitmentCompleted()` after successful completion
- ✅ Pass `creditsRefunded` amount to track refunds
- ✅ Error handling: Logs stats errors but doesn't fail the request

### `fail_commitment/index.ts`
**Changes:**
- ✅ Import `handleCommitmentFailed` from shared utilities
- ✅ Call `handleCommitmentFailed()` after marking commitment as missed
- ✅ Resets user's streak on failure
- ✅ Error handling: Logs stats errors but doesn't fail the request

### `sweep_overdue_commitments/index.ts`
**Note:** This function calls `fail_commitment`, so it automatically triggers `handleCommitmentFailed()` through that function. No direct changes needed.

### `create_commitment/index.ts` (NEW)
**Created new edge function for commitment creation:**
- ✅ Import `validateNewCommitment` from shared utilities
- ✅ Validates commitment before creation
- ✅ Deducts credits from user balance
- ✅ Creates commitment record
- ✅ Creates credit transaction record
- ✅ Updates user stats via `validateNewCommitment()`
- ✅ CORS headers for frontend integration

---

## 4. Frontend Updates (✅ Complete)

### `client/src/lib/mock-data.tsx`
**Changes:**
- ✅ Added scheduled date validation in `createCommitment()`
- ✅ Ensures scheduled date is in the future
- ✅ Maintains consistency with backend validation

---

## 5. How It Works

### Commitment Creation Flow
```
1. User attempts to create commitment
2. validateNewCommitment() checks:
   - Sufficient credits?
   - Future scheduled date?
3. If valid:
   - Deduct credits from balance
   - Create commitment record
   - Increment total_commitments_created
   - Add to total_credits_spent
4. Return commitment to user
```

### Completion Flow
```
1. User marks commitment complete
2. Update commitment status to "completed"
3. If refundOnCompletion:
   - Refund credits to user
   - Create refund transaction
4. handleCommitmentCompleted():
   - Increment total_commitments_completed
   - Increment current_streak
   - Update longest_streak if needed
   - Add to total_credits_refunded
```

### Failure Flow
```
1. Commitment deadline passes OR manual fail button
2. Update commitment status to "missed"
3. handleCommitmentFailed():
   - Increment total_commitments_failed
   - **Reset current_streak to 0**
   - Log failure timestamp
4. Credits remain forfeited (already spent)
```

---

## 6. Future: Optional Perks

The `perks` field in `user_stats` is a JSON field ready for future enhancements:

### Suggested Perks Structure
```json
{
  "streak_protection": false,      // Save streak on 1 failure
  "double_refund": false,           // 2x refund on completion
  "credit_multiplier": false,       // Earn bonus credits
  "priority_support": false,        // Access to priority features
  "custom_consequences": false      // Unlock custom consequence types
}
```

### Implementation Notes
- Toggle perks via user settings
- Check perks before applying rules in handler functions
- Could be earned through achievements or purchases
- Example: If `streak_protection` is true, delay resetting streak by 1 failure

---

## 7. Testing Checklist

### Database Migration
- [ ] Run migration: `supabase migration up`
- [ ] Verify table created: `SELECT * FROM user_stats LIMIT 1;`
- [ ] Test trigger: Create new user, check if stats auto-created
- [ ] Test RLS: User can only see own stats

### Edge Functions
- [ ] Test `create_commitment`: Create with valid/invalid data
- [ ] Test `complete_commitment`: Complete and verify stats update
- [ ] Test `fail_commitment`: Fail and verify streak reset
- [ ] Test `sweep_overdue_commitments`: Ensure it calls fail_commitment

### Frontend
- [ ] Create commitment with future date: Success
- [ ] Create commitment with past date: Error
- [ ] Create with insufficient credits: Error
- [ ] Complete commitment: Check stats update
- [ ] Fail commitment: Check streak reset

---

## 8. Deployment Steps

1. **Deploy Database Migration**
   ```bash
   supabase db push
   ```

2. **Deploy Edge Functions**
   ```bash
   supabase functions deploy complete_commitment
   supabase functions deploy fail_commitment
   supabase functions deploy create_commitment
   ```

3. **Verify Environment Variables**
   - Ensure `SUPABASE_URL` is set
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

4. **Test in Production**
   - Create a test commitment
   - Complete it and verify stats
   - Create another and let it fail
   - Verify streak reset

---

## 9. Files Modified/Created

### New Files
1. `supabase/migrations/002_user_stats_table.sql` - Database schema
2. `supabase/functions/_shared/user-stats.ts` - Shared utilities
3. `supabase/functions/create_commitment/index.ts` - Commitment creation endpoint

### Modified Files
1. `supabase/functions/complete_commitment/index.ts` - Added stats tracking
2. `supabase/functions/fail_commitment/index.ts` - Added stats tracking + streak reset
3. `client/src/lib/mock-data.tsx` - Added date validation

---

## 10. API Reference

### Create Commitment
```typescript
POST /functions/v1/create_commitment
{
  userId: string;
  intentId?: string;
  intentText: string;
  creditsCost: number;
  consequenceType: 'money' | 'social' | 'escalate';
  scheduledDate: string; // ISO format
  refundOnCompletion?: boolean; // default: true
  stripePaymentIntentId?: string;
}
```

### Complete Commitment
```typescript
POST /functions/v1/complete_commitment
{
  commitmentId: string;
  userId: string;
}
```

### Fail Commitment
```typescript
POST /functions/v1/fail_commitment
{
  commitmentId: string;
}
```

---

## Summary

✅ All requirements implemented:
1. ✅ Added `user_stats` table with defaults
2. ✅ On complete → calls `handleCommitmentCompleted()`
3. ✅ On fail (manual + sweep) → calls `handleCommitmentFailed()`
4. ✅ On create → calls `validateNewCommitment()`
5. ✅ Perks field added for future optional switches

**Ready for deployment!**
