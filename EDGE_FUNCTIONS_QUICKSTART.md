# Edge Functions - Quick Reference

## What Was Created

### New Edge Functions for Passive Detection

1. **`process_intent_signal`** ([supabase/functions/process_intent_signal/index.ts](supabase/functions/process_intent_signal/index.ts))
   - Processes incoming intent signals from all sources
   - Normalizes text, categorizes, scores confidence
   - Matches against existing patterns or creates new ones
   - Returns detection result with prompt recommendation

2. **`sync_input_sources`** ([supabase/functions/sync_input_sources/index.ts](supabase/functions/sync_input_sources/index.ts))
   - Background job to poll connected input sources
   - Calls message APIs, calendar APIs, etc.
   - Processes each signal through `process_intent_signal`
   - Returns count of signals/patterns created

3. **`get_active_patterns`** ([supabase/functions/get_active_patterns/index.ts](supabase/functions/get_active_patterns/index.ts))
   - Retrieves all active patterns for a user
   - Used by frontend to show pattern dashboard
   - Returns patterns that should trigger prompts

## Deployment Commands

### One-Line Deploy (all functions)
```bash
cd supabase/functions && for func in */; do supabase functions deploy "${func%/}"; done
```

### Individual Deploy
```bash
supabase functions deploy process_intent_signal
supabase functions deploy sync_input_sources
supabase functions deploy get_active_patterns
```

## API Usage Examples

### Process a Signal
```bash
curl -X POST https://[project].supabase.co/functions/v1/process_intent_signal \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "source_type": "manual",
    "raw_text": "I really need to start working out"
  }'
```

**Response:**
```json
{
  "signal_id": "signal_1738224567_abc123",
  "normalized_intent": "start working out",
  "category": "fitness",
  "confidence": 0.75,
  "pattern_id": "pattern_xyz789",
  "should_prompt": false,
  "urgency": "low"
}
```

### Sync Input Sources
```bash
curl -X POST https://[project].supabase.co/functions/v1/sync_input_sources \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "x-sweep-secret: [YOUR_SECRET]" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123"}'
```

**Response:**
```json
{
  "user_id": "user123",
  "signals_created": 3,
  "patterns_updated": 2,
  "new_prompts": 1
}
```

### Get Active Patterns
```bash
curl https://[project].supabase.co/functions/v1/get_active_patterns?user_id=user123 \
  -H "Authorization: Bearer [ANON_KEY]"
```

**Response:**
```json
{
  "patterns": [
    {
      "id": "pattern_1",
      "normalized_intent": "start working out",
      "category": "fitness",
      "occurrence_count": 5,
      "day_span": 7,
      "suggested_stake": 20
    }
  ]
}
```

## Environment Variables Needed

Set in Supabase Dashboard → Project Settings → Edge Functions:

```bash
OPENAI_API_KEY=sk-...                    # For analyze_intent
STRIPE_SECRET_KEY=sk_live_...            # For payment functions
SWEEP_SECRET=random-secret-string        # For cron job protection
SUPABASE_SERVICE_ROLE_KEY=...            # Auto-provided by Supabase
```

## Cron Job Setup (15-minute sync)

Add to Supabase SQL Editor:
```sql
SELECT cron.schedule(
  'sync-input-sources-all-users',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[project].supabase.co/functions/v1/sync_input_sources',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-sweep-secret', current_setting('app.settings.sweep_secret')
    ),
    body := jsonb_build_object('user_id', 'all')
  );
  $$
);
```

## Integration with Frontend

Update [client/src/lib/supabase.ts](client/src/lib/supabase.ts) to call real functions:

```typescript
// In production mode:
const { data, error } = await supabase.functions.invoke("process_intent_signal", {
  body: { 
    user_id: user.id, 
    source_type: "manual", 
    raw_text: intentText 
  }
});
```

## Files Created

- ✅ [supabase/functions/process_intent_signal/](supabase/functions/process_intent_signal/)
- ✅ [supabase/functions/sync_input_sources/](supabase/functions/sync_input_sources/)
- ✅ [supabase/functions/get_active_patterns/](supabase/functions/get_active_patterns/)
- ✅ [deploy-functions.sh](deploy-functions.sh) - Automated deployment script
- ✅ [EDGE_FUNCTIONS_DEPLOYMENT.md](EDGE_FUNCTIONS_DEPLOYMENT.md) - Full guide
- ✅ [DEPLOY_INSTRUCTIONS.sh](DEPLOY_INSTRUCTIONS.sh) - Quick reference

## Next Steps

1. Run `supabase login` on your local machine
2. Run `supabase link --project-ref pirhugiuguaahvvxifpu`
3. Run `./deploy-functions.sh` to deploy all functions
4. Set environment variables in Supabase Dashboard
5. Test with curl commands above
6. Set up cron job for auto-sync
7. Update frontend to use real functions instead of mocks

## Documentation

- **Full Deployment Guide**: [EDGE_FUNCTIONS_DEPLOYMENT.md](EDGE_FUNCTIONS_DEPLOYMENT.md)
- **Passive Detection System**: [PASSIVE_DETECTION.md](PASSIVE_DETECTION.md)
- **Testing Guide**: [TESTING_PASSIVE_DETECTION.md](TESTING_PASSIVE_DETECTION.md)
