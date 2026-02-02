#!/bin/bash

# Test Deployed Edge Functions
# Your Supabase Anon Key is stored here for easy testing

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcmh1Z2l1Z3VhYWh2dnhpZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTk4ODksImV4cCI6MjA4MzEzNTg4OX0.17Nt5CbAhiMU-BLugKcerPcicTiL_rJmF6ztmtB9Ck4"
PROJECT_URL="https://pirhugiuguaahvvxifpu.supabase.co"

echo "🧪 Testing Lockstep Edge Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Process Intent Signal
echo "📤 Test 1: Process Intent Signal"
echo "Request: 'I really need to start working out more'"
echo ""
curl -s --location --request POST \
  "${PROJECT_URL}/functions/v1/process_intent_signal" \
  --header "Authorization: Bearer ${ANON_KEY}" \
  --header "Content-Type: application/json" \
  --data '{"user_id":"test-user-123","source_type":"manual","raw_text":"I really need to start working out more"}' | jq .
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Get Active Patterns
echo "📊 Test 2: Get Active Patterns"
curl -s --location --request GET \
  "${PROJECT_URL}/functions/v1/get_active_patterns?user_id=test-user-123" \
  --header "Authorization: Bearer ${ANON_KEY}" | jq .
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3: Process Different Intents
echo "📤 Test 3: Multiple Intents (Building Pattern)"
echo ""

intents=(
  "I want to work out"
  "I should go to the gym"
  "I need to exercise more"
  "I keep saying I'll start working out"
)

for intent in "${intents[@]}"; do
  echo "Testing: '$intent'"
  curl -s --location --request POST \
    "${PROJECT_URL}/functions/v1/process_intent_signal" \
    --header "Authorization: Bearer ${ANON_KEY}" \
    --header "Content-Type: application/json" \
    --data "{\"user_id\":\"test-user-123\",\"source_type\":\"manual\",\"raw_text\":\"$intent\"}" | jq -r '.normalized_intent + " (confidence: " + (.confidence | tostring) + ")"'
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All tests completed!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Supabase Dashboard"
echo "2. Update frontend to use real functions (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)"
echo "3. Set up cron job for sync_input_sources"
