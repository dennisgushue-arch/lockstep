#!/bin/bash

# Deploy Supabase Edge Functions
# Make sure you're logged in: supabase login

set -e

echo "🚀 Deploying Supabase Edge Functions for Lockstep..."
echo ""

# Check if logged in
if ! supabase projects list > /dev/null 2>&1; then
    echo "❌ Not logged in to Supabase. Run: supabase login"
    exit 1
fi

# Get project reference from config
PROJECT_REF=$(grep 'project_id' supabase/config.toml | cut -d '"' -f 2)

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Could not find project_id in supabase/config.toml"
    exit 1
fi

echo "📦 Project: $PROJECT_REF"
echo ""

# Deploy each function
FUNCTIONS=(
    "analyze_intent"
    "create_stake_intent"
    "purchase_credits"
    "confirm_credit_purchase"
    "complete_commitment"
    "fail_commitment"
    "sweep_overdue_commitments"
    "process_intent_signal"
    "sync_input_sources"
    "get_active_patterns"
)

for func in "${FUNCTIONS[@]}"; do
    echo "📤 Deploying: $func"
    if supabase functions deploy "$func" --project-ref "$PROJECT_REF"; then
        echo "✅ $func deployed successfully"
    else
        echo "❌ Failed to deploy $func"
        exit 1
    fi
    echo ""
done

echo "🎉 All functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Supabase Dashboard:"
echo "   - OPENAI_API_KEY (for analyze_intent)"
echo "   - STRIPE_SECRET_KEY (for payment functions)"
echo "   - SWEEP_SECRET (for cron jobs)"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "2. Test functions:"
echo "   curl -i --location --request POST \\"
echo "     'https://$PROJECT_REF.supabase.co/functions/v1/process_intent_signal' \\"
echo "     --header 'Authorization: Bearer [YOUR_ANON_KEY]' \\"
echo "     --header 'Content-Type: application/json' \\"
echo "     --data '{\"user_id\":\"test\",\"source_type\":\"manual\",\"raw_text\":\"I want to work out\"}'"
echo ""
echo "3. Set up cron job for sync_input_sources (every 15 min)"
echo ""
