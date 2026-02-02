## ✅ Cron Jobs Setup - Ready to Deploy

### Your SQL file is prepared with the correct SWEEP_SECRET!

**File**: `supabase/cron-jobs.sql`

---

## 🚀 Final Steps (2 minutes):

### 1. Open Supabase SQL Editor
Click this link to open the SQL Editor in your browser:
👉 **https://supabase.com/dashboard/project/pirhugiuguaahvvxifpu/sql/new**

### 2. Copy & Run the SQL
- Open `supabase/cron-jobs.sql` in VS Code (it's already open!)
- **Select All** (Ctrl+A or Cmd+A)
- **Copy** (Ctrl+C or Cmd+C)
- **Paste** into the Supabase SQL Editor
- Click **"Run"** or press Ctrl+Enter

### 3. Verify Jobs are Created
After running, execute this query in the same SQL Editor:
```sql
SELECT * FROM cron.job;
```

You should see two jobs:
- `sync-input-sources-passive-detection` (runs every 15 minutes)
- `sweep-overdue-commitments` (runs every hour)

---

## ⚙️ Environment Variables Required

Make sure these are set in **Supabase Dashboard → Settings → Edge Functions → Environment Variables**:

✅ **SWEEP_SECRET**: `e58b45c60b9eb8a2fd62a038a781635d88f68178bdc43a0862c78a081a7e4e41`
✅ **OPENAI_API_KEY**: (your OpenAI API key)
✅ **STRIPE_SECRET_KEY**: (your Stripe secret key)
✅ **SUPABASE_SERVICE_ROLE_KEY**: (from Supabase Dashboard → Settings → API)

---

## 📊 Monitor Jobs

View cron job execution history:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 🎉 What Happens Next?

Once the SQL runs successfully:
1. **Every 15 minutes**: `sync_input_sources` will check for new intent signals
2. **Every hour**: `sweep_overdue_commitments` will capture payments for missed commitments

---

## 🔧 Troubleshooting

If jobs don't run:
- Check Edge Functions logs in Supabase Dashboard
- Verify environment variables are set correctly
- Ensure the SWEEP_SECRET matches in both SQL and environment variables

Need to update a job? Unschedule it first:
```sql
SELECT cron.unschedule('sync-input-sources-passive-detection');
-- Then re-run the cron.schedule() command with updates
```

---

**Ready?** Open the SQL Editor link above and paste the SQL! 🚀
