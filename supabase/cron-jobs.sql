-- Supabase Cron Jobs Setup
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/pirhugiuguaahvvxifpu/sql/new

-- Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- ============================================
-- CRON JOB 1: Sync Input Sources (Every 15 minutes)
-- ============================================
-- Polls all connected input sources for new intent signals

SELECT cron.schedule(
  'sync-input-sources-passive-detection',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/sync_input_sources',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'x-sweep-secret', 'e58b45c60b9eb8a2fd62a038a781635d88f68178bdc43a0862c78a081a7e4e41'
      ),
      body := jsonb_build_object(
        'user_id', 'all'  -- Process for all users (modify in function to handle this)
      )
    ) AS request_id;
  $$
);

-- ============================================
-- CRON JOB 2: Sweep Overdue Commitments (Every hour)
-- ============================================
-- Checks for missed commitment deadlines and captures payments

SELECT cron.schedule(
  'sweep-overdue-commitments',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/sweep_overdue_commitments',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sweep-secret', 'e58b45c60b9eb8a2fd62a038a781635d88f68178bdc43a0862c78a081a7e4e41'
      )
    ) AS request_id;
  $$
);

-- ============================================
-- View all scheduled cron jobs
-- ============================================
SELECT * FROM cron.job;

-- ============================================
-- View cron job execution history
-- ============================================
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- ============================================
-- To unschedule/delete a cron job:
-- ============================================
-- SELECT cron.unschedule('sync-input-sources-passive-detection');
-- SELECT cron.unschedule('sweep-overdue-commitments');

-- ============================================
-- To update a cron job, unschedule it first, then reschedule
-- ============================================
