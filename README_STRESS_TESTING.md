# 🧪 Stress Testing Infrastructure

Complete setup for proving the system handles load without crashing, prevents double charges, maintains consistency, and is debuggable.

## TL;DR

```bash
# Deploy
supabase db push
supabase functions deploy complete_commitment fail_commitment stress_test_gen

# Test
node scripts/stress.mjs --level 1 --user-id test_user --url http://localhost:54321 --key your_key
```

**Expected:** Takes 5 seconds, 100% success, all invariants pass ✅

---

## What's Inside

### 🔍 Observability
- **Request IDs** - Every response includes `requestId` for tracing
- **Audit Trail** - Every action logged with full context in `commitment_audit_log` table
- **Structured Logs** - All logs are JSON, easy to parse and filter
- **Stripe Details** - Every Stripe call tracked (success, error, attempts)

### 🛡️ Safety
- **Idempotency Guard** - `fail_commitment` detects duplicates and returns "already processed"
- **Status Validation** - Only valid transitions allowed (active→missed/completed, never missed→completed)
- **Database Consistency** - Audit trail ensures every action is traceable

### 🚀 Load Testing
- **Stress Generator** - Creates bulk overdue commitments instantly (`stress_test_gen`)
- **Test Levels** - 4 progressive levels from 10 to 200+ commitments
- **Concurrent Sweeps** - Test idempotency with simultaneous requests
- **Automatic Verification** - Checks critical invariants automatically

### 📊 Metrics
- Sweep latency (per commitment)
- Error rates
- Double-charge detection
- Status conflict detection

---

## Architecture

### New Database Columns
```
commitments table:
  stake_captured_at          -- When Stripe capture succeeded
  stake_capture_failed_at    -- When capture failed
  stake_error_code           -- Stripe error code
  stake_error_message        -- Error message
  last_sweep_at              -- When sweep last checked this
  last_sweep_request_id      -- Request ID of last sweep
  failed_at                  -- When marked failed
  completed_at               -- When marked completed
```

### New Table
```
commitment_audit_log:
  id, commitment_id, user_id, request_id
  action (create|complete|fail|sweep|capture_attempt)
  status_before, status_after
  stripe_pi_id, stripe_action, stripe_error_code, stripe_error_message
  metadata (JSON)
  created_at
```

### New Endpoints
```
POST /functions/v1/stress_test_gen
  Input:  userId, numCommitments, dueMinutesAgo, stakeAmount
  Output: requestId, created, commitmentIds, level
  
POST /functions/v1/complete_commitment (UPDATED)
  Now includes: requestId, audit logging
  
POST /functions/v1/fail_commitment (UPDATED)
  Now includes: requestId, audit logging, idempotency guard
```

---

## Quick Start

### 1. Deploy to Staging
```bash
# Update database
supabase db push

# Deploy functions with logging
supabase functions deploy complete_commitment
supabase functions deploy fail_commitment
supabase functions deploy stress_test_gen
```

### 2. Run Level 1 Test (Correctness)
```bash
node scripts/stress.mjs --level 1 \
  --user-id staging_test_1 \
  --url https://staging.supabase.co \
  --key YOUR_ANON_KEY
```

**Expected output:**
```
📝 Creating 10 overdue commitments...
   ✅ Created 10 commitments
🧹 Sweep...
   ✅ Scanned: 10, Processed: 10
🔍 Verifying Invariants...
   ✅ Commitments created
   ✅ Sweeps executed
   ✅ No critical errors
✅ LEVEL 1 PASSED
```

### 3. Run Level 2 Test (Idempotency)
```bash
node scripts/stress.mjs --level 2 \
  --user-id staging_test_2 \
  --url https://staging.supabase.co \
  --key YOUR_ANON_KEY
```

**Tests 10 concurrent sweeps on same 25 commitments**
- Verifies each commitment processes only once
- Checks `alreadyProcessed` flag works
- Proves no double charges

### 4. Check Database
```sql
-- Verify no double processing
SELECT commitment_id, COUNT(*) as times
FROM commitment_audit_log
WHERE action = 'fail'
GROUP BY commitment_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- View audit trail for a commitment
SELECT action, status_before, status_after, request_id
FROM commitment_audit_log
WHERE commitment_id = 'xxxx'
ORDER BY created_at;
```

---

## Stress Test Levels

### Level 1: Functional Mini Load (5 seconds)
**Goal:** Prove basic correctness

```
10 commitments (overdue)
  ↓
1 sweep
  ↓
Verify all become "failed"
```

**Check:**
```bash
node scripts/stress.mjs --level 1 --user-id test_user \
  --url http://localhost:54321 --key test_key
```

**Success:** All 10 marked as failed, 0 duplicates

---

### Level 2: Concurrency (10 seconds)
**Goal:** Prove idempotency

```
25 commitments (overdue)
  ↓
10 sweeps concurrently (50ms apart)
  ↓
Verify idempotent (no double processing)
```

**Check:**
```bash
node scripts/stress.mjs --level 2 --user-id test_user \
  --url http://localhost:54321 --key test_key
```

**Success:** 
- All 25 commitments fail exactly once
- Sweeps 2-10 return `alreadyProcessed: true`
- 0 duplicate Stripe charges

---

### Level 3: Volume (30-60 seconds)
**Goal:** Measure throughput

```
200 commitments (overdue)
  ↓
8 batches of sweeps (25 at a time)
  ↓
Measure duration and error rate
```

**Check:**
```bash
node scripts/stress.mjs --level 3 --user-id test_user \
  --url http://localhost:54321 --key test_key
```

**Targets:**
- Avg sweep time: <2 seconds
- Error rate: <1%
- All commitments processed

---

### Level 4: Realistic Mix (30-60 seconds)
**Goal:** Simulate real app traffic

```
100 commitments (overdue)
  ↓
5 sweeps sequentially (realistic cron job)
  ↓
Verify end-to-end correctness
```

**Check:**
```bash
node scripts/stress.mjs --level 4 --user-id test_user \
  --url http://localhost:54321 --key test_key
```

---

## Key Features

### Request Tracing
Every response includes a unique `requestId`:

```json
{
  "success": true,
  "requestId": "req_1706234567890_abc123def",
  "commitmentId": "xyz789",
  "alreadyProcessed": false
}
```

**Why:** Trace failures across multiple functions
```bash
# Find all actions for a request
grep "req_1706234567890_abc123def" logs
```

---

### Idempotency Guard
Safe to call fail_commitment multiple times:

```javascript
const result1 = await failCommitment("commitment_123");
// { success: true, alreadyProcessed: false } → Processes

const result2 = await failCommitment("commitment_123");
// { success: true, alreadyProcessed: true } → Returns early

const result3 = await failCommitment("commitment_123");
// { success: true, alreadyProcessed: true } → Returns early
```

**Result:** Zero double charges ✅

---

### Audit Trail
Every action logged with full context:

```sql
SELECT * FROM commitment_audit_log WHERE commitment_id = 'xyz';

-- Result:
-- action   | status_before | status_after | request_id      | created_at
-- create   | NULL          | active       | req_xxx         | 2026-02-03 12:00:00
-- fail     | active        | missed       | req_yyy         | 2026-02-03 12:05:00
-- fail     | missed        | missed       | req_zzz         | 2026-02-03 12:05:01 <- duplicate detected!
```

**Why:** Complete history for debugging

---

## Critical Invariants

Your system is "safe" only if these are true:

### ✅ Status Transitions Valid
- `active → completed` ✅
- `active → missed` ✅
- `missed → completed` ❌ (invalid)
- `completed → missed` ❌ (invalid)

**Check:**
```sql
SELECT * FROM commitments
WHERE (status = 'completed' AND id IN (SELECT commitment_id FROM commitment_audit_log WHERE status_after = 'missed'));
-- Should return 0 rows
```

### ✅ No Double Processing
- First sweep: processes commitment ✅
- Second sweep: returns "already processed" ✅
- No Stripe charge twice ✅

**Check:**
```sql
SELECT commitment_id, COUNT(*) as times
FROM commitment_audit_log
WHERE action = 'fail' AND status_after = 'missed'
GROUP BY commitment_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### ✅ Complete Audit Trail
- Every status change has an entry ✅
- No "ghost" updates ✅
- All request IDs present ✅

**Check:**
```sql
SELECT COUNT(*) as missing FROM commitments c
LEFT JOIN commitment_audit_log cal ON c.id = cal.commitment_id
WHERE c.status != 'active' AND cal.id IS NULL;
-- Should return 0
```

---

## Debugging

### Find All Actions for a Commitment
```sql
SELECT action, status_before, status_after, request_id, created_at
FROM commitment_audit_log
WHERE commitment_id = 'xxxx'
ORDER BY created_at;
```

### Find a Request's Full Path
```bash
REQUEST_ID="req_1706234567890_abc123def"
grep "$REQUEST_ID" logs | jq .
```

### Check Sweep Performance
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as commitments_processed,
  AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_duration_ms
FROM commitment_audit_log
WHERE action = 'fail'
GROUP BY hour
ORDER BY hour DESC;
```

### Find Unprocessed Commitments
```sql
SELECT id, status, scheduled_at
FROM commitments
WHERE status = 'active' AND scheduled_at < NOW() - INTERVAL '10 minutes'
ORDER BY scheduled_at;
```

---

## Performance Baselines

**Level 1 (10 commitments, 1 sweep):**
- Expected: <100ms per commitment
- Total: <2 seconds

**Level 2 (25 commitments, 10 sweeps):**
- Expected: <100ms per commitment
- Concurrent sweeps: 100% idempotency rate
- Total: <10 seconds

**Level 3 (200 commitments, 8 batches):**
- Expected: <2 seconds per batch
- Error rate: <1%
- Total: 30-60 seconds

---

## Deployment

### Step 1: Migrate Database
```bash
supabase db push
```

### Step 2: Deploy Functions
```bash
supabase functions deploy complete_commitment
supabase functions deploy fail_commitment
supabase functions deploy stress_test_gen
```

### Step 3: Run Smoke Test
```bash
node scripts/stress.mjs --level 1 --user-id smoke_test \
  --url https://your-project.supabase.co --key YOUR_ANON_KEY
```

### Step 4: Verify Invariants
See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

### Step 5: Monitor
- Check logs for errors
- Run Level 2 test every hour
- Weekly Level 3 test
- Monthly Level 4 test

---

## Files

| File | Purpose |
|------|---------|
| `supabase/migrations/003_stress_test_tracking.sql` | Database schema (audit table, columns) |
| `supabase/functions/_shared/logging.ts` | Structured logging + request IDs |
| `supabase/functions/stress_test_gen/index.ts` | Create test commitments |
| `supabase/functions/complete_commitment/index.ts` | Updated with logging |
| `supabase/functions/fail_commitment/index.ts` | Updated with idempotency guard |
| `scripts/stress.mjs` | Test client (4 levels) |
| `STRESS_TESTING.md` | Detailed guide |
| `STRESS_TEST_SUMMARY.md` | Features summary |
| `DEPLOYMENT_CHECKLIST.md` | Deploy & verify steps |

---

## Next Steps

1. ✅ Deploy migrations + functions
2. ✅ Run Level 1 test
3. ✅ Run Level 2 test (idempotency)
4. ✅ Run Level 3 test (volume)
5. ✅ Add to CI/CD (run Level 1 on every PR)
6. ✅ Monitor production

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed steps.

---

## Support

**Q: My test failed, what do I do?**
A: Check [STRESS_TESTING.md](./STRESS_TESTING.md#debugging-guide)

**Q: Can I customize the stress test?**
A: Edit `scripts/stress.mjs` or the endpoints (all parameters exposed)

**Q: How do I add this to my CI/CD?**
A: See [STRESS_TESTING.md](./STRESS_TESTING.md#running-against-production)

**Q: Is this safe to run in production?**
A: Yes, but use a separate test user. See deployment checklist.

---

## Summary

✅ **Request IDs** - Trace every operation  
✅ **Idempotency** - Prevents double charges  
✅ **Audit Trail** - Complete history  
✅ **Stress Tests** - 4 levels  
✅ **Automatic Checks** - Invariants verified  

**Result:** Safe, consistent, debuggable system under load 🚀
