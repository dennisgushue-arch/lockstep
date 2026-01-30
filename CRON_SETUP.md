# Cron Jobs Setup Guide

## Quick Setup (Recommended)

### Option 1: Using Supabase SQL Editor (Easiest)

1. **Go to SQL Editor**
   https://supabase.com/dashboard/project/pirhugiuguaahvvxifpu/sql/new

2. **Copy and paste the contents of `supabase/cron-jobs.sql`**
   
3. **Replace `your-sweep-secret-here` with your actual secret**
   - Use the same secret you set in Edge Functions environment variables
   - Or generate a new one: `openssl rand -hex 32`

4. **Run the SQL**
   - Click "Run" button
   - This will create 2 cron jobs

5. **Verify cron jobs are running**
   ```sql
   SELECT * FROM cron.job;
   ```

### Option 2: Using GitHub Actions (Alternative)

If you prefer external cron jobs, use GitHub Actions:

1. **Create `.github/workflows/cron-sync.yml`**

```yaml
name: Sync Input Sources

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call sync_input_sources
        run: |
          curl -X POST https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/sync_input_sources \
            -H "Content-Type: application/json" \
            -H "x-sweep-secret: ${{ secrets.SWEEP_SECRET }}" \
            -d '{"user_id":"all"}'
```

2. **Add secrets to GitHub**
   - Go to: Settings → Secrets and variables → Actions
   - Add: `SWEEP_SECRET`

### Option 3: Using cron-job.org (External Service)

1. Go to https://cron-job.org
2. Create account and add new cron job
3. **Job 1: Sync Input Sources**
   - URL: `https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/sync_input_sources`
   - Schedule: Every 15 minutes
   - Method: POST
   - Headers:
     - `Content-Type: application/json`
     - `x-sweep-secret: your-secret`
   - Body: `{"user_id":"all"}`

4. **Job 2: Sweep Overdue**
   - URL: `https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/sweep_overdue_commitments`
   - Schedule: Every hour
   - Method: POST
   - Headers:
     - `Content-Type: application/json`
     - `x-sweep-secret: your-secret`

## Cron Job Details

### Job 1: sync_input_sources
- **Frequency**: Every 15 minutes (`*/15 * * * *`)
- **Purpose**: Polls connected input sources (messages, calendar) for new intent signals
- **What it does**:
  - Checks messages for intent keywords
  - Analyzes calendar for repeated event patterns
  - Processes each signal through detection algorithm
  - Updates patterns and triggers prompts

### Job 2: sweep_overdue_commitments
- **Frequency**: Every hour (`0 * * * *`)
- **Purpose**: Checks for missed commitment deadlines
- **What it does**:
  - Finds commitments past their deadline
  - Calls `fail_commitment` to capture Stripe payment
  - Updates commitment status to 'missed'

## Verify Cron Jobs Are Working

### Check Supabase Logs
```bash
# View recent sync job logs
supabase functions logs sync_input_sources --tail

# View sweep job logs
supabase functions logs sweep_overdue_commitments --tail
```

### Check Cron Execution History (if using pg_cron)
```sql
-- In Supabase SQL Editor
SELECT 
  jobid,
  job_name,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

### Manual Test
You can manually trigger the functions to test:

```bash
# Test sync
curl -X POST https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/sync_input_sources \
  -H "Content-Type: application/json" \
  -H "x-sweep-secret: your-secret" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"user_id":"test-user-123"}'

# Test sweep
curl -X POST https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/sweep_overdue_commitments \
  -H "Content-Type: application/json" \
  -H "x-sweep-secret: your-secret"
```

## Troubleshooting

### Cron jobs not running
1. Check if `pg_cron` extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check if jobs are scheduled:
   ```sql
   SELECT * FROM cron.job;
   ```

3. Check execution logs:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```

### 401 Unauthorized errors
- Verify `SWEEP_SECRET` environment variable is set in Supabase Dashboard
- Ensure `x-sweep-secret` header matches the environment variable

### Jobs execute but do nothing
- Check Edge Function logs: `supabase functions logs sync_input_sources`
- Verify users have connected input sources in database
- Test function manually with curl

## Monitoring

### Set Up Alerts (Optional)
You can set up alerts for cron job failures:

1. **Using Supabase Dashboard**
   - Go to: Settings → Integrations
   - Connect Slack/Discord webhook
   - Configure alerts for function errors

2. **Using External Monitoring**
   - UptimeRobot, Pingdom, etc.
   - Monitor function endpoints
   - Alert on HTTP errors

## Uninstall/Disable Cron Jobs

```sql
-- List all jobs
SELECT jobid, jobname, schedule FROM cron.job;

-- Unschedule a specific job
SELECT cron.unschedule('sync-input-sources-passive-detection');
SELECT cron.unschedule('sweep-overdue-commitments');

-- Or disable by jobid
SELECT cron.unschedule(123);  -- Replace with actual jobid
```

## Next Steps

1. ✅ Run `supabase/cron-jobs.sql` in SQL Editor
2. ✅ Replace `your-sweep-secret-here` with actual secret
3. ✅ Verify jobs are scheduled: `SELECT * FROM cron.job;`
4. ✅ Wait 15 minutes and check logs
5. ✅ Monitor execution history
6. ✅ Set up alerts (optional)

Your passive detection system will now automatically sync every 15 minutes! 🎉
