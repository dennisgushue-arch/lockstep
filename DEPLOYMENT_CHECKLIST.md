# Stress Testing Deployment Checklist

## Pre-Deployment

### App Release Sanity Gate

- [ ] Run detection smoke test first: `pnpm smoke:detection`
- [ ] If smoke fails, stop release flow and fix before proceeding
- [ ] Generate store screenshots only after smoke passes: `pnpm screenshots:play`
- [ ] Build release artifacts (AAB/IPA) only after screenshot refresh

**Required order:** `pnpm smoke:detection` → `pnpm screenshots:play` → `pnpm mobile:build` → release bundle creation

### Code Review

- [ ] Review logging.ts for any sensitive data leakage
- [ ] Verify idempotency guard logic (can't bypass double-charge protection)
- [ ] Check that request IDs are properly propagated
- [ ] Confirm audit logging doesn't impact performance

### Testing

- [ ] Run Level 1 test locally
- [ ] Run Level 2 test locally (concurrency check)
- [ ] Verify stress_test_gen creates proper payloads
- [ ] Check that sweep endpoint is idempotent

---

## Deployment Steps

### 1. Database Migration

```bash
# Before deploying functions, ensure database is updated
supabase db push
```

**Verify:**

```bash
# Check new columns exist
psql $DATABASE_URL -c "\d commitments" | grep -E "stake_captured|last_sweep|failed_at|completed_at"

# Check audit table exists
psql $DATABASE_URL -c "\d commitment_audit_log"
```

### 2. Deploy Edge Functions

```bash
# Deploy updated functions with logging and idempotency
supabase functions deploy complete_commitment
supabase functions deploy fail_commitment
supabase functions deploy stress_test_gen
```

**Ensure secrets are set before deploy:**

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SWEEP_SECRET`
- `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY` (32-byte base64; generate via `node scripts/generate_token_key.mjs`)

**Verify each function deployed:**

```bash
curl https://your-project.supabase.co/functions/v1/stress_test_gen \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"userId":"test","numCommitments":1}' 2>&1 | grep -q '"success"' && echo "✅ stress_test_gen"

curl https://your-project.supabase.co/functions/v1/complete_commitment \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"commitmentId":"test","userId":"test"}' 2>&1 | grep -q '"requestId"' && echo "✅ complete_commitment"

curl https://your-project.supabase.co/functions/v1/fail_commitment \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"commitmentId":"test"}' 2>&1 | grep -q '"requestId"' && echo "✅ fail_commitment"
```

### 3. Run Smoke Tests

```bash
# Level 1: Quick correctness check
node scripts/stress.mjs --level 1 --user-id smoke_test_1 \
  --url https://your-project.supabase.co \
  --key $ANON_KEY

# Verify:
# ✅ LEVEL 1 PASSED
```

### 4. Run Full Stress Tests

```bash
# Level 2: Concurrency (idempotency check)
node scripts/stress.mjs --level 2 --user-id stress_test_2 \
  --url https://your-project.supabase.co \
  --key $ANON_KEY

# Verify:
# ✅ LEVEL 2 PASSED
```

### 5. Verify Invariants

```bash
# In Supabase dashboard or psql:

# Check 1: No double captures
SELECT commitment_id, COUNT(*) as times
FROM commitment_audit_log
WHERE action = 'fail' AND status_after = 'missed'
GROUP BY commitment_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows

# Check 2: All audit entries present
SELECT COUNT(*) as missing
FROM commitments c
LEFT JOIN commitment_audit_log cal ON c.id = cal.commitment_id
WHERE c.status != 'active' AND cal.id IS NULL;
-- Expected: 0 rows

# Check 3: Valid status transitions
SELECT ca1.commitment_id
FROM commitment_audit_log ca1
JOIN commitment_audit_log ca2 ON ca1.commitment_id = ca2.commitment_id
WHERE ca1.created_at < ca2.created_at
  AND ((ca1.status_after = 'missed' AND ca2.status_after = 'completed')
    OR (ca1.status_after = 'completed' AND ca2.status_after = 'missed'));
-- Expected: 0 rows
```

---

## Post-Deployment

### Monitor Logs

```bash
# Watch for errors in first hour
tail -f logs | grep -i "error\|failed\|exception"

# Check request distribution
tail -f logs | jq '.action' | sort | uniq -c
```

### Check Metrics

- [ ] No 5xx errors in logs
- [ ] sweep_overdue_commitments still runs on schedule
- [ ] All requests have requestId
- [ ] No missing commitment_audit_log entries

### Performance Baseline

```bash
# Record baseline performance
psql $DATABASE_URL -c "
  SELECT
    action,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_duration_ms
  FROM commitment_audit_log
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY action;
"
```

### Run Baseline Tests Every Hour

```bash
# Automated check (add to cron)
0 * * * * node scripts/stress.mjs --level 1 --user-id hourly_check_$(date +%s) \
  --url https://your-project.supabase.co \
  --key $ANON_KEY 2>&1 | grep -q "PASSED" && echo "✅ Hourly check passed" || echo "❌ Hourly check failed"
```

---

## Rollback Plan

If issues arise:

### Quick Disable (keep functions deployed)

```sql
-- Disable audit logging (non-critical path)
ALTER TABLE commitment_audit_log DISABLE TRIGGER ALL;
```

### Full Rollback

```bash
# Revert functions to previous version
git checkout HEAD~1 supabase/functions/
supabase functions deploy complete_commitment
supabase functions deploy fail_commitment

# Preserve audit data by not rolling back migrations
# (Just don't use new columns if necessary)
```

### Investigation

```sql
-- Find the problematic commitment
SELECT * FROM commitment_audit_log
WHERE status_after = 'error'
ORDER BY created_at DESC
LIMIT 10;

-- Check request details
SELECT action, status_before, status_after, request_id, metadata
FROM commitment_audit_log
WHERE request_id = 'req_xxx'
ORDER BY created_at;
```

---

## Success Criteria

✅ **All checks must pass:**

- [ ] Database migration successful (new columns present)
- [ ] All 3 functions deploy without errors
- [ ] Level 1 stress test passes (correctness)
- [ ] Level 2 stress test passes (idempotency)
- [ ] No duplicate processing detected in audit trail
- [ ] All status transitions are valid
- [ ] All requestIds are present in responses
- [ ] No 5xx errors in logs
- [ ] Audit log entries are recorded for all actions
- [ ] Sweep continues to process overdue commitments

---

## Performance Targets

| Metric | Target | Check |
|--------|--------|-------|
| Sweep Latency (per commitment) | <100ms | `duration_ms` in logs |
| Error Rate | <1% | No errors in Level 2 test |
| Double Charge Prevention | 100% | 0 duplicate `fail` entries per commitment |
| Audit Coverage | 100% | All status != 'active' have audit entries |

---

## Sign-Off

+
Date: ___________________
Deployed By: ___________________
Reviewed By: ___________________

All checks passed: ☐ YES ☐ NO

Notes:
_____________________________________________________________________________

_____________________________________________________________________________
```

---

## Ongoing Maintenance

### Weekly

- [ ] Run Level 2 test
- [ ] Review error logs
- [ ] Check audit log for anomalies

### Monthly

- [ ] Run Level 3 test
- [ ] Analyze performance trends
- [ ] Update documentation if needed

### Quarterly

- [ ] Full Level 4 realistic mix test
- [ ] Review and optimize slow queries
- [ ] Update performance baselines
