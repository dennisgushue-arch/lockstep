#!/bin/bash

# Test Passive Detection System End-to-End
# Replace YOUR_ANON_KEY with your actual anon key

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcmh1Z2l1Z3VhYWh2dnhpZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTk4ODksImV4cCI6MjA4MzEzNTg4OX0.17Nt5CbAhiMU-BLugKcerPcicTiL_rJmF6ztmtB9Ck4"
SWEEP_SECRET="e58b45c60b9eb8a2fd62a038a781635d88f68178bdc43a0862c78a081a7e4e41"
BASE_URL="https://pirhugiuguaahvvxifpu.supabase.co/functions/v1"

echo "🧪 Testing Passive Detection System"
echo "===================================="
echo ""

# Test 1: Process Intent Signal
echo "1️⃣ Testing process_intent_signal..."
curl -s -X POST "${BASE_URL}/process_intent_signal" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "source_type": "message",
    "raw_text": "I really need to finish that proposal by Friday"
  }' | jq '.'

echo ""
echo "2️⃣ Testing get_active_patterns..."
curl -s -X GET "${BASE_URL}/get_active_patterns?user_id=test-user-123" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "3️⃣ Testing sync_input_sources..."
curl -s -X POST "${BASE_URL}/sync_input_sources" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "x-sweep-secret: ${SWEEP_SECRET}" \
  -d '{
    "user_id": "test-user-123"
  }' | jq '.'

echo ""
echo "✅ Testing complete! Check the responses above."
