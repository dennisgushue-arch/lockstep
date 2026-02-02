# Supabase Edge Functions Deployment Guide

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to your project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Your project ref is in `supabase/config.toml` (currently: `pirhugiuguaahvvxifpu`)

## Edge Functions Overview

### Existing Functions
- **`analyze_intent`**: AI-powered intent analysis (uses OpenAI)
- **`complete_commitment`**: Mark commitment as completed, release Stripe hold
- **`fail_commitment`**: Mark commitment as failed, capture Stripe payment
- **`sweep_overdue_commitments`**: Cron job to check for missed deadlines

### New Functions (Passive Detection)
- **`process_intent_signal`**: Process incoming intent signals from all sources
- **`sync_input_sources`**: Background job to poll connected sources
- **`get_active_patterns`**: Retrieve active patterns for user

## Quick Deploy (All Functions)

```bash
./deploy-functions.sh
```

This script will deploy all 7 Edge Functions to your Supabase project.

## Manual Deploy (Individual Functions)

### Deploy All at Once
```bash
cd supabase/functions
for func in */; do
  supabase functions deploy "${func%/}"
done
```

### Deploy Individual Function
```bash
supabase functions deploy analyze_intent
supabase functions deploy process_intent_signal
supabase functions deploy sync_input_sources
supabase functions deploy get_active_patterns
supabase functions deploy complete_commitment
supabase functions deploy fail_commitment
supabase functions deploy sweep_overdue_commitments
```

## Environment Variables

Set these in your Supabase Dashboard → Settings → Edge Functions:

### Required for All Functions
```bash
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### OpenAI Integration (for analyze_intent)
```bash
OPENAI_API_KEY=sk-...
```

### Stripe Integration (for payment functions)
```bash
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
```

### Cron Job Protection
```bash
SWEEP_SECRET=your-random-secret-string
```

## Testing Functions

### 1. Test process_intent_signal
```bash
curl -i --location --request POST \
  'https://[your-project].supabase.co/functions/v1/process_intent_signal' \
  --header 'Authorization: Bearer [YOUR_ANON_KEY]' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "test-user-123",
    "source_type": "manual",
    "raw_text": "I really need to start working out more"
  }'
```

Expected response:
```json
{
  "signal_id": "signal_...",
  "normalized_intent": "start working out more",
  "category": "fitness",
  "confidence": 0.75,
  "pattern_id": "pattern_...",
  "should_prompt": false,
  "urgency": "low"
}
```

### 2. Test sync_input_sources
```bash
curl -i --location --request POST \
  'https://[your-project].supabase.co/functions/v1/sync_input_sources' \
  --header 'Authorization: Bearer [YOUR_ANON_KEY]' \
  --header 'x-sweep-secret: your-sweep-secret' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "test-user-123"
  }'
```

Expected response:
```json
{
  "user_id": "test-user-123",
  "signals_created": 3,
  "patterns_updated": 2,
  "new_prompts": 1
}
```

### 3. Test get_active_patterns
```bash
curl -i --location --request GET \
  'https://[your-project].supabase.co/functions/v1/get_active_patterns?user_id=test-user-123' \
  --header 'Authorization: Bearer [YOUR_ANON_KEY]'
```

## Local Testing

### Start Supabase locally
```bash
supabase start
```

### Serve function locally
```bash
supabase functions serve process_intent_signal --env-file ./supabase/.env.local
```

### Test locally
```bash
curl -i --location --request POST \
  'http://127.0.0.1:54321/functions/v1/process_intent_signal' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{"user_id":"test","source_type":"manual","raw_text":"I want to work out"}'
```

## Cron Jobs Setup

### Option 1: Supabase Cron (pg_cron)

Add to your Supabase SQL Editor:

```sql
-- Sync input sources every 15 minutes
SELECT cron.schedule(
  'sync-input-sources',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[your-project].supabase.co/functions/v1/sync_input_sources',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-sweep-secret', current_setting('app.settings.sweep_secret')
    ),
    body := jsonb_build_object('user_id', 'all')
  ) AS request_id;
  $$
);

-- Sweep overdue commitments every hour
SELECT cron.schedule(
  'sweep-overdue-commitments',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[your-project].supabase.co/functions/v1/sweep_overdue_commitments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sweep-secret', current_setting('app.settings.sweep_secret')
    )
  ) AS request_id;
  $$
);
```

### Option 2: External Cron (cron-job.org, GitHub Actions, etc.)

Set up external cron to call functions with proper headers.

## Monitoring

### View function logs
```bash
supabase functions logs process_intent_signal
supabase functions logs sync_input_sources --tail
```

### View in Supabase Dashboard
1. Go to Supabase Dashboard → Edge Functions
2. Click on function name
3. View "Logs" tab for recent invocations

## Troubleshooting

### Function not found
- Verify deployment: `supabase functions list`
- Check project ref is correct in `config.toml`

### 401 Unauthorized
- Check Authorization header is included
- Verify anon key or service role key is correct
- For cron jobs, check `x-sweep-secret` header

### 500 Internal Server Error
- Check function logs: `supabase functions logs [function-name]`
- Verify environment variables are set
- Test locally first with `supabase functions serve`

### Database connection issues
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Check database permissions
- Verify Drizzle schema is pushed: `pnpm db:push`

## Update Frontend to Use Real Functions

Once deployed, update `client/src/lib/supabase.ts` to call real functions instead of mocks:

```typescript
// Replace mock implementations with:
const { data, error } = await supabase.functions.invoke("process_intent_signal", {
  body: { user_id, source_type, raw_text }
});
```

## Next Steps

1. ✅ Deploy all functions
2. ✅ Set environment variables
3. ✅ Test each function with curl
4. ✅ Set up cron jobs
5. ✅ Push Drizzle schema to database: `pnpm db:push`
6. ✅ Update frontend to use real functions
7. ✅ Monitor logs for errors
8. ✅ Set up OAuth for input sources (Google Calendar, etc.)

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime API](https://deno.land/api)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
