# Stress Testing Documentation Index

Complete stress testing infrastructure for ensuring system reliability under load.

## 🚀 Start Here

**New to stress testing?** Start with [README_STRESS_TESTING.md](./README_STRESS_TESTING.md)
- TL;DR quick start
- Feature overview
- Basic examples

## 📚 Documentation

### Quick References
1. **[README_STRESS_TESTING.md](./README_STRESS_TESTING.md)** ← START HERE
   - Quick start (5 min read)
   - Feature overview
   - Basic usage examples
   - Links to detailed docs

### Detailed Guides
2. **[STRESS_TESTING.md](./STRESS_TESTING.md)**
   - Complete reference
   - All 4 test levels explained
   - Debugging guide with examples
   - Critical invariants to verify
   - API reference for all endpoints

3. **[STRESS_TEST_SUMMARY.md](./STRESS_TEST_SUMMARY.md)**
   - Features breakdown
   - What you get (request IDs, idempotency, etc.)
   - Files created/updated
   - Integration points
   - Performance targets

4. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** ← DEPLOY WITH THIS
   - Step-by-step deployment
   - Smoke tests
   - Invariant verification
   - Rollback plan
   - Sign-off checklist

## 🔧 Running Tests

### Quick Test (Level 1)
```bash
node scripts/stress.mjs --level 1 \
  --user-id test_user \
  --url http://localhost:54321 \
  --key your_anon_key
```
**Time:** 5 seconds | **Proves:** Correctness

### Idempotency Test (Level 2)
```bash
node scripts/stress.mjs --level 2 \
  --user-id test_user \
  --url http://localhost:54321 \
  --key your_anon_key
```
**Time:** 10 seconds | **Proves:** No double charges

### Volume Test (Level 3)
```bash
node scripts/stress.mjs --level 3 \
  --user-id test_user \
  --url http://localhost:54321 \
  --key your_anon_key
```
**Time:** 30-60 seconds | **Proves:** Throughput under load

### Realistic Mix (Level 4)
```bash
node scripts/stress.mjs --level 4 \
  --user-id test_user \
  --url http://localhost:54321 \
  --key your_anon_key
```
**Time:** 30-60 seconds | **Proves:** Real-world scenario

## 📁 Code Files

### Database
- [supabase/migrations/003_stress_test_tracking.sql](./supabase/migrations/003_stress_test_tracking.sql)
  - New audit table
  - New tracking columns
  - RLS policies, indexes

### Utilities
- [supabase/functions/_shared/logging.ts](./supabase/functions/_shared/logging.ts)
  - StructuredLogger class
  - auditLog() helper
  - generateRequestId()

### Edge Functions
- [supabase/functions/stress_test_gen/index.ts](./supabase/functions/stress_test_gen/index.ts)
  - Create bulk test commitments
  - POST endpoint

- [supabase/functions/complete_commitment/index.ts](./supabase/functions/complete_commitment/index.ts)
  - Updated with logging
  - Added request ID
  - Added audit trail

- [supabase/functions/fail_commitment/index.ts](./supabase/functions/fail_commitment/index.ts)
  - Added idempotency guard
  - Added request ID
  - Added audit trail
  - **Prevents double charges** ✅

### Testing
- [scripts/stress.mjs](./scripts/stress.mjs)
  - Level 1-4 test client
  - Automatic verification
  - Performance metrics

## ✅ What It Proves

| Proof | How | Test |
|-------|-----|------|
| **No crashes** | Handles 200 commitments + sweeps | Level 3 |
| **No double charges** | Idempotency guard + audit trail | Level 2 |
| **Consistent state** | Valid status transitions | All levels |
| **Debuggable** | Request IDs + audit log | All levels |

## 🎯 Critical Invariants

These must ALL be true or the system isn't safe:

1. ✅ **Status transitions valid**
   - `active → completed` ✓
   - `active → missed` ✓
   - `missed → completed` ✗
   - `completed → missed` ✗

2. ✅ **No double processing**
   - Sweep 1: processes
   - Sweep 2+: returns "already processed"

3. ✅ **Complete audit trail**
   - Every action logged
   - All request IDs present

4. ✅ **Stripe idempotent**
   - Capture runs at most once
   - Errors recorded

See [STRESS_TESTING.md#critical-invariants-to-assert](./STRESS_TESTING.md) for verification queries.

## 📊 Performance Targets

| Level | Commitments | Duration | Target |
|-------|-------------|----------|--------|
| 1 | 10 | 5s | <100ms/commitment |
| 2 | 25 | 10s | 100% idempotent |
| 3 | 200 | 30-60s | <2s/batch, <1% error |
| 4 | 100 | 30-60s | Realistic flow |

## 🚀 Deployment Steps

1. **Read** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
2. **Deploy** migrations: `supabase db push`
3. **Deploy** functions: `supabase functions deploy ...`
4. **Run** Level 1 smoke test
5. **Run** Level 2 idempotency test
6. **Verify** invariants with SQL queries
7. **Monitor** with hourly Level 1 tests

## 🔍 Debugging

See [STRESS_TESTING.md#debugging-guide](./STRESS_TESTING.md#debugging-guide) for:
- Find double charges
- Check sweep performance
- Trace requests through system
- Verify status transitions
- Audit trail queries

## 📈 CI/CD Integration

Add to your pipeline:
```yaml
- name: Stress Test Level 1
  run: node scripts/stress.mjs --level 1 --user-id ci_test \
    --url $SUPABASE_URL --key $ANON_KEY
```

See [STRESS_TESTING.md#running-against-production](./STRESS_TESTING.md) for full CI/CD example.

## 💡 Key Features

### Request IDs
Every response includes `requestId` for tracing:
```json
{
  "success": true,
  "requestId": "req_1706234567890_abc123def"
}
```

### Idempotency Guard
Safe to call multiple times:
```javascript
await fail_commitment(id); // First: processes
await fail_commitment(id); // Second: alreadyProcessed: true
```

### Audit Trail
Full history in `commitment_audit_log`:
```sql
SELECT * FROM commitment_audit_log
WHERE commitment_id = 'xyz'
ORDER BY created_at;
```

### Structured Logs
All JSON, easy to parse:
```json
{
  "requestId": "req_xxx",
  "action": "fail_commitment",
  "level": "info",
  "details": {...}
}
```

## 📞 Questions?

- **How do I run Level 1?** → See README_STRESS_TESTING.md
- **How do I deploy?** → See DEPLOYMENT_CHECKLIST.md
- **How do I debug?** → See STRESS_TESTING.md
- **How do I verify?** → See STRESS_TESTING.md#critical-invariants

## ✨ Summary

✅ **Request tracing** - Every request has an ID  
✅ **Idempotency** - No double charges  
✅ **Audit trail** - Complete history  
✅ **Stress tests** - 4 progressive levels  
✅ **Verification** - Automatic invariant checks  

**Result:** Safe, consistent, debuggable system ✅

---

**Last Updated:** Feb 3, 2026  
**Status:** Ready for Deployment
