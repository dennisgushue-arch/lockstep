# Stress Testing Infrastructure

Complete setup for proving the system handles load correctly, prevents double charges, maintains consistency, and is debuggable.

## Quick Start

### 1. Deploy Changes
```bash
# Deploy migrations
supabase db push

# Deploy new functions
supabase functions deploy stress_test_gen
supabase functions deploy complete_commitment
supabase functions deploy fail_commitment
```

### 2. Run Stress Test
```bash
# Level 1: Simple correctness (5-10 seconds)
node scripts/stress.mjs --level 1 --user-id user_123 \
  --url http://localhost:54321 --key <your_anon_key>

# Level 2: Concurrency check (10-20 seconds)
node scripts/stress.mjs --level 2 --user-id user_123 \
  --url http://localhost:54321 --key <your_anon_key>

# Level 3: Volume test (30-60 seconds)
node scripts/stress.mjs --level 3 --user-id user_123 \
  --url http://localhost:54321 --key <your_anon_key>
```

---

## What Was Added

### 1. Database Tracking (003_stress_test_tracking.sql)

**New columns on `commitments` table:**
```sql
stake_captured_at          -- When Stripe capture succeeded
stake_capture_failed_at    -- When capture failed
stake_error_code           -- Stripe error code
stake_error_message        -- Stripe error message
last_sweep_at              -- Last time sweep checked this commitment
last_sweep_request_id      -- Request ID of last sweep
failed_at                  -- When marked as failed
completed_at               -- When marked as completed
```

**New `commitment_audit_log` table:**
Stores every action with full context:
- `request_id` - Trace failures across the system
- `action` - 'create', 'complete', 'fail', 'sweep', 'capture_attempt'
- `status_before`, `status_after` - Detect invalid transitions
- `stripe_*` - Full Stripe details for each attempt
- `metadata` - JSON for extensibility

Example query:
```sql
-- Find all actions for a commitment
SELECT action, status_before, status_after, request_id, created_at
FROM commitment_audit_log
WHERE commitment_id = 'xxx'
ORDER BY created_at;

-- Find all sweeps
SELECT commitment_id, ok_count, errors
FROM commitment_audit_log
WHERE action = 'sweep'
ORDER BY created_at DESC;
```

---

### 2. Structured Logging (logging.ts)

Every response includes a `requestId` for tracing:

**Response format:**
```json
{
  "success": true,
  "requestId": "req_1706234567890_abc123def",
  "commitmentId": "xyz",
  "alreadyProcessed": false
}
```

**Log format (structured JSON):**
```json
{
  "requestId": "req_1706234567890_abc123def",
  "timestamp": "2026-02-03T12:34:56Z",
  "level": "info",
  "action": "fail_commitment",
  "userId": "user_123",
  "details": {
    "commitmentId": "xyz",
    "statusBefore": "active",
    "statusAfter": "missed"
  }
}
```

Parse logs with:
```bash
# Follow a request through all functions
cat logs | grep "req_1706234567890_abc123def"

# Count errors per action
cat logs | jq '.level=="error" | .action' | sort | uniq -c

# Find slow operations
cat logs | jq 'select(.duration > 1000)'
```

---

### 3. Idempotency Guard

**In `fail_commitment`, we detect already-processed commitments:**

```typescript
// Check if already processed
const alreadyFailed = commitment.status === "missed" || commitment.status === "failed";
const alreadyCaptured = commitment.stake_captured_at !== null;

if (alreadyFailed && alreadyCaptured) {
  // Return success with "already processed" flag
  return {
    success: true,
    alreadyProcessed: true,
    previousRequestId: commitment.last_sweep_request_id
  };
}
```

**Safe to call multiple times:**
```javascript
// All these return success, no double charge
await failCommitment(id); // First call: processes
await failCommitment(id); // Second call: returns "already processed"
await failCommitment(id); // Third call: returns "already processed"
```

---

### 4. Stress Test Generator (`stress_test_gen`)

**Endpoint:** `POST /functions/v1/stress_test_gen`

**Request:**
```json
{
  "userId": "user_123",
  "numCommitments": 10,
  "dueMinutesAgo": 5,
  "stakeAmount": 100
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "req_xxx",
  "created": 10,
  "commitmentIds": ["id1", "id2", ...],
  "scheduledAt": "2026-02-03T12:29:56Z",
  "level": "Level 1 (Mini)"
}
```

Creates overdue commitments for testing:
- Sets `scheduled_at` to the past (immediately overdue)
- Perfect for sweep testing
- Safe to create thousands (limited to 1000)

---

### 5. Stress Test Client (`scripts/stress.mjs`)

**Levels (run in order):**

#### Level 1: Functional Mini Load (Correctness)
```bash
node scripts/stress.mjs --level 1 --user-id user_123 --url ... --key ...
```
- Creates **10 overdue commitments**
- Runs sweep **once**
- Verifies:
  - All become failed
  - No duplicate processing
  - All get audit entries

**Expected:** Takes ~5 seconds, 100% success rate

#### Level 2: Concurrency (Idempotency)
```bash
node scripts/stress.mjs --level 2 --user-id user_123 --url ... --key ...
```
- Creates **25 overdue commitments**
- Runs sweep **10 times concurrently** (50ms apart)
- Verifies:
  - Each commitment fails once
  - Duplicate sweeps return "already processed"
  - No double captures

**Expected:** Takes ~10 seconds, 100% success, all return `alreadyProcessed: false` on first run

#### Level 3: Volume (Throughput)
```bash
node scripts/stress.mjs --level 3 --user-id user_123 --url ... --key ...
```
- Creates **200 overdue commitments**
- Sweeps in **8 batches** of 25
- Measures:
  - Duration per batch
  - Error rate
  - Max time for any batch

**Expected:** 
- Takes ~30-60 seconds
- <2 second sweep time per batch
- <1% error rate

#### Level 4: Realistic Mix
```bash
node scripts/stress.mjs --level 4 --user-id user_123 --url ... --key ...
```
- Creates **100 overdue commitments**
- Runs **5 sweeps** sequentially
- Simulates real app traffic patterns

---

## Critical Invariants to Assert

### A) Status Transitions Must Be Valid

**Valid transitions:**
```
active → completed (when user marks done)
active → missed (when sweep runs)
```

**Invalid (would indicate bugs):**
```
missed → completed (can't uncomplete a missed commitment)
completed → missed (can't unmiss a completed commitment)
active → active (should only happen once)
```

**Check with:**
```sql
-- Find invalid transitions
SELECT 
  ca1.commitment_id,
  ca1.status_after as status_1,
  ca2.status_after as status_2,
  ca1.created_at,
  ca2.created_at
FROM commitment_audit_log ca1
JOIN commitment_audit_log ca2 ON ca1.commitment_id = ca2.commitment_id
WHERE ca1.created_at < ca2.created_at
  AND (
    (ca1.status_after = 'missed' AND ca2.status_after = 'completed') OR
    (ca1.status_after = 'completed' AND ca2.status_after = 'missed')
  );

-- Should return 0 rows
```

### B) Stake Transitions Must Be Safe

**Valid:**
```
authorized → released (completed, refund enabled)
authorized → captured (failed)
null → released (completed, no stake)
null → captured (failed, no stake)
```

**Invalid:**
```
captured → released (can't uncapture)
released → captured (can't recapture)
captured → captured (double capture!)
```

**Check with:**
```sql
-- Find commitments that were captured multiple times
SELECT
  commitment_id,
  COUNT(*) as capture_count,
  ARRAY_AGG(request_id) as request_ids,
  ARRAY_AGG(created_at) as timestamps
FROM commitment_audit_log
WHERE action = 'capture_attempt' AND stripe_action = 'capture'
GROUP BY commitment_id
HAVING COUNT(*) > 1;

-- Should return 0 rows
```

### C) Stripe Captures Are Idempotent

**Check:**
```sql
-- Find any commitment processed by multiple requests
SELECT
  commitment_id,
  COUNT(DISTINCT request_id) as request_count,
  COUNT(*) as total_log_entries,
  status_after,
  ARRAY_AGG(DISTINCT request_id) as request_ids
FROM commitment_audit_log
WHERE action = 'fail'
GROUP BY commitment_id, status_after
HAVING COUNT(DISTINCT request_id) > 1;

-- Should return 0 rows for status='missed'
```

### D) Audit Trail Is Complete

Every status change must have an audit entry:

```sql
-- Find missing audit entries
SELECT c.id, c.status, c.updated_at
FROM commitments c
LEFT JOIN commitment_audit_log cal ON c.id = cal.commitment_id
WHERE c.status != 'active' AND cal.id IS NULL;

-- Should return 0 rows
```

---

## Debugging Guide

### I see double charges or duplicate processing

**Check idempotency:**
```bash
# Get all requests for a commitment
curl "$SUPABASE_URL/rest/v1/commitment_audit_log?commitment_id=eq.xxx" \
  -H "Authorization: Bearer $KEY"

# Look for multiple 'fail' or 'capture' actions
# If found, check if 'alreadyProcessed' flag was returned
```

### Sweeps are slow

**Check per-commitment time:**
```sql
-- Average time per commitment in recent sweeps
SELECT
  DATE_TRUNC('minute', created_at) as minute,
  AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_ms
FROM commitment_audit_log
WHERE action = 'fail'
ORDER BY minute DESC;
```

### Some commitments weren't processed

**Find unprocessed commitments:**
```sql
SELECT id, status, scheduled_at
FROM commitments
WHERE status = 'active' AND scheduled_at < NOW() - INTERVAL '10 minutes';
```

**Check sweep logs:**
```sql
SELECT *
FROM commitment_audit_log
WHERE action = 'sweep'
ORDER BY created_at DESC
LIMIT 10;
```

### Request IDs don't match

**Trace a request through all functions:**
```bash
# In browser console or curl
const requestId = "req_xxx";

// Search all logs for this request
cat logs | grep "$requestId" | jq .

// Check audit trail
curl "https://your-project.supabase.co/rest/v1/commitment_audit_log?request_id=eq.$requestId" \
  -H "Authorization: Bearer $KEY"
```

---

## Running Against Production

⚠️ **Only in dedicated load test environment**

```bash
# With real Supabase URL and key
node scripts/stress.mjs --level 2 \
  --user-id test_user_load_12345 \
  --url https://your-project.supabase.co \
  --key "YOUR_ANON_KEY"
```

**Safety measures:**
1. Create a separate test user
2. Start with Level 1 only
3. Monitor database queries during test
4. Check audit_log for anomalies
5. Verify with invariant queries before moving to Level 2

---

## Metrics to Track

| Metric | Level 1 | Level 2 | Level 3 |
|--------|---------|---------|---------|
| Commitments | 10 | 25 | 200 |
| Sweeps | 1 | 10 | 8 batches |
| Avg sweep time | <100ms | <100ms | <2s |
| Error rate | 0% | 0% | <1% |
| Idempotency rate | 100% | 100% on 2+ | 100% |
| Status conflicts | 0 | 0 | 0 |

---

## Next Steps

1. **Deploy migrations** - Adds audit table and columns
2. **Deploy functions** - Includes new logging and idempotency checks
3. **Run Level 1** - Verify basic functionality
4. **Run Level 2** - Verify idempotency
5. **Run Level 3** - Measure throughput
6. **Add to CI/CD** - Run before production deploys

```yaml
# Example GitHub Actions
- name: Run Stress Tests
  run: |
    node scripts/stress.mjs --level 1 --user-id test_level1 --url $SUPABASE_URL --key $ANON_KEY
    node scripts/stress.mjs --level 2 --user-id test_level2 --url $SUPABASE_URL --key $ANON_KEY
```
