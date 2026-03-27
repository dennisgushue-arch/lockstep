#!/bin/bash

# Supabase Edge Functions - Quick Deployment Instructions
# This script provides the commands needed to deploy functions

cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║     Supabase Edge Functions - Deployment Instructions         ║
╔════════════════════════════════════════════════════════════════╝

📦 STEP 1: Install Supabase CLI (on your local machine)
────────────────────────────────────────────────────────────────
# macOS:
brew install supabase/tap/supabase

# Windows (via Scoop):
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux:
# Download from: https://github.com/supabase/cli/releases


🔑 STEP 2: Login to Supabase
────────────────────────────────────────────────────────────────
supabase login


🔗 STEP 3: Link to Your Project
────────────────────────────────────────────────────────────────
cd /path/to/lockstep
supabase link --project-ref pirhugiuguaahvvxifpu


🚀 STEP 4: Deploy All Functions
────────────────────────────────────────────────────────────────
# Deploy all at once:
cd supabase/functions
for func in */; do supabase functions deploy "${func%/}"; done

# Or deploy individually:
supabase functions deploy analyze_intent
supabase functions deploy process_intent_signal
supabase functions deploy sync_input_sources
supabase functions deploy get_active_patterns
supabase functions deploy complete_commitment
supabase functions deploy fail_commitment
supabase functions deploy sweep_overdue_commitments


⚙️  STEP 5: Set Environment Variables
────────────────────────────────────────────────────────────────
Go to: https://supabase.com/dashboard/project/pirhugiuguaahvvxifpu/settings/functions

Add these secrets:
• OPENAI_API_KEY=sk-...
• STRIPE_SECRET_KEY=sk_live_... or sk_test_...
• SWEEP_SECRET=your-random-secret
• SUPABASE_SERVICE_ROLE_KEY=(auto-provided)


🧪 STEP 6: Test Your Functions
────────────────────────────────────────────────────────────────
# Test process_intent_signal:
curl -i --location --request POST \
  'https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/process_intent_signal' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"user_id":"test","source_type":"manual","raw_text":"I want to work out"}'

# Test get_active_patterns:
curl -i --location --request GET \
  'https://pirhugiuguaahvvxifpu.supabase.co/functions/v1/get_active_patterns?user_id=test' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'


⏰ STEP 7: Set Up Cron Jobs (Optional)
────────────────────────────────────────────────────────────────
Option A: Supabase Dashboard → Database → Cron Jobs
Add job to call sync_input_sources every 15 minutes

Option B: External service (cron-job.org, GitHub Actions)
Schedule POST requests to your functions


📊 STEP 8: Monitor Logs
────────────────────────────────────────────────────────────────
supabase functions logs process_intent_signal
supabase functions logs sync_input_sources --tail


✅ Verification Checklist
────────────────────────────────────────────────────────────────
[ ] Supabase CLI installed
[ ] Logged in with: supabase login
[ ] Project linked
[ ] All 7 functions deployed
[ ] Environment variables set
[ ] Functions tested with curl
[ ] Cron jobs configured
[ ] Logs show no errors


📁 Functions Deployed:
────────────────────────────────────────────────────────────────
1. analyze_intent           - AI intent analysis (OpenAI)
2. complete_commitment      - Mark commitment done
3. fail_commitment          - Charge for missed commitment
4. sweep_overdue_commitments - Cron job for deadline checks
5. process_intent_signal    - NEW: Process intent signals
6. sync_input_sources       - NEW: Poll connected sources
7. get_active_patterns      - NEW: Get user patterns


📚 Full Documentation: ./EDGE_FUNCTIONS_DEPLOYMENT.md

EOF
