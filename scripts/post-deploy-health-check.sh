#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/supabase/config.toml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
JSON_MODE=0

for arg in "$@"; do
  case "$arg" in
    --json)
      JSON_MODE=1
      ;;
    -h|--help)
      echo "Usage: bash ./scripts/post-deploy-health-check.sh [--json]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: bash ./scripts/post-deploy-health-check.sh [--json]" >&2
      exit 2
      ;;
  esac
done

log() {
  if [[ $JSON_MODE -eq 0 ]]; then
    echo -e "$1"
  fi
}

pass() {
  log "${GREEN}✅ $1${NC}"
  PASS_COUNT=$((PASS_COUNT + 1))
}

warn() {
  log "${YELLOW}⚠️  $1${NC}"
  WARN_COUNT=$((WARN_COUNT + 1))
}

fail() {
  log "${RED}❌ $1${NC}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

section() {
  if [[ $JSON_MODE -eq 0 ]]; then
    echo ""
    echo -e "${BLUE}$1${NC}"
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "Missing required command: $cmd"
    return 1
  fi
  pass "Found command: $cmd"
  return 0
}

read_project_ref() {
  if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
    echo "$SUPABASE_PROJECT_REF"
    return
  fi

  if [[ -f "$CONFIG_FILE" ]]; then
    local ref
    ref=$(grep -E '^project_id\s*=\s*"[^"]+"' "$CONFIG_FILE" | head -1 | sed -E 's/^project_id\s*=\s*"([^"]+)".*/\1/')
    if [[ -n "$ref" ]]; then
      echo "$ref"
      return
    fi
  fi

  echo ""
}

read_env_value() {
  local key="$1"
  local file
  for file in "$ROOT_DIR/.env" "$ROOT_DIR/.env.local"; do
    if [[ -f "$file" ]]; then
      local value
      value=$(grep -E "^${key}=" "$file" | tail -1 | cut -d '=' -f2- | sed -E 's/^"|"$//g' || true)
      if [[ -n "$value" ]]; then
        echo "$value"
        return
      fi
    fi
  done
  echo ""
}

if [[ $JSON_MODE -eq 0 ]]; then
  echo "🔎 Lockstep post-deploy health check"
  echo "===================================="
fi

section "1) Tooling"
require_cmd npx >/dev/null || true
require_cmd curl >/dev/null || true
require_cmd python3 >/dev/null || true

PROJECT_REF="$(read_project_ref)"
if [[ -z "$PROJECT_REF" ]]; then
  fail "Could not determine Supabase project ref (set SUPABASE_PROJECT_REF or supabase/config.toml project_id)"
else
  pass "Project ref: $PROJECT_REF"
fi

SUPABASE_URL="${SUPABASE_URL:-}"
if [[ -z "$SUPABASE_URL" && -n "$PROJECT_REF" ]]; then
  SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
fi

section "2) Function deployment state"
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  fail "SUPABASE_ACCESS_TOKEN is not set (required for deployment/secrets checks)"
else
  FUNCTIONS_RAW=$(SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx supabase functions list --project-ref "$PROJECT_REF" 2>&1)
  if [[ $? -ne 0 ]]; then
    fail "Unable to list functions: $FUNCTIONS_RAW"
  else
    pass "Supabase functions list succeeded"

    for fn in request_cashout process_cashout_batch stripe_cashout_webhook; do
      line=$(echo "$FUNCTIONS_RAW" | grep -E "\|\s*${fn}\s*\|" | tail -1 || true)
      if [[ -z "$line" ]]; then
        fail "Function missing from project: $fn"
      elif echo "$line" | grep -q "ACTIVE"; then
        pass "Function ACTIVE: $fn"
      else
        fail "Function not ACTIVE: $fn"
      fi
    done
  fi
fi

section "3) Required secret names"
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  warn "Skipping secret-name check (SUPABASE_ACCESS_TOKEN missing)"
else
  SECRETS_RAW=$(SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx supabase secrets list --project-ref "$PROJECT_REF" 2>&1)
  if [[ $? -ne 0 ]]; then
    fail "Unable to list secrets: $SECRETS_RAW"
  else
    pass "Supabase secrets list succeeded"

    for secret_name in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET BATCH_PAYOUT_SECRET; do
      if echo "$SECRETS_RAW" | grep -q "$secret_name"; then
        pass "Secret present: $secret_name"
      else
        fail "Missing secret: $secret_name"
      fi
    done
  fi
fi

section "4) Public endpoint reachability"
if [[ -z "$SUPABASE_URL" ]]; then
  fail "SUPABASE_URL unresolved"
else
  pass "Using SUPABASE_URL=$SUPABASE_URL"
  for fn in request_cashout process_cashout_batch stripe_cashout_webhook; do
    code=$(curl -sS -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/functions/v1/${fn}" || echo "000")
    if [[ "$code" == "404" || "$code" == "000" ]]; then
      fail "Endpoint not reachable: ${fn} (HTTP ${code})"
    else
      pass "Endpoint reachable: ${fn} (HTTP ${code})"
    fi
  done
fi

section "5) Stripe webhook wiring"
WEBHOOK_URL="${SUPABASE_URL}/functions/v1/stripe_cashout_webhook"
if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  warn "Skipping Stripe webhook verification (STRIPE_SECRET_KEY not set in shell)"
else
  WEBHOOK_RESULT=$(STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" WEBHOOK_URL="$WEBHOOK_URL" python3 - <<'PY'
import json
import os
import subprocess
import sys

sk = os.environ.get('STRIPE_SECRET_KEY', '')
url = os.environ.get('WEBHOOK_URL', '')

proc = subprocess.run(
    ['curl', '-sS', 'https://api.stripe.com/v1/webhook_endpoints', '-u', f'{sk}:'],
    capture_output=True,
    text=True,
)
if proc.returncode != 0:
    print(json.dumps({'ok': False, 'error': proc.stderr.strip() or 'curl failed'}))
    sys.exit(0)

try:
    payload = json.loads(proc.stdout)
except json.JSONDecodeError:
    print(json.dumps({'ok': False, 'error': 'Invalid JSON from Stripe API'}))
    sys.exit(0)

matches = [e for e in payload.get('data', []) if e.get('url') == url and e.get('status') == 'enabled']
if not matches:
    print(json.dumps({'ok': False, 'error': 'No enabled endpoint found for URL'}))
    sys.exit(0)

events = set()
for m in matches:
    events.update(m.get('enabled_events', []))

missing = [e for e in ('refund.created', 'refund.updated') if e not in events]
if missing:
    print(json.dumps({'ok': False, 'error': f'Missing events: {", ".join(missing)}'}))
    sys.exit(0)

print(json.dumps({'ok': True, 'count': len(matches)}))
PY
)

  if echo "$WEBHOOK_RESULT" | grep -q '"ok": true'; then
    pass "Stripe webhook endpoint enabled with required events"
  else
    fail "Stripe webhook verification failed: $WEBHOOK_RESULT"
  fi
fi

section "Summary"
if [[ $JSON_MODE -eq 0 ]]; then
  echo -e "Passed: ${GREEN}${PASS_COUNT}${NC}"
  echo -e "Warnings: ${YELLOW}${WARN_COUNT}${NC}"
  echo -e "Failed: ${RED}${FAIL_COUNT}${NC}"
fi

if [[ $FAIL_COUNT -gt 0 ]]; then
  if [[ $JSON_MODE -eq 1 ]]; then
    echo "{\"status\":\"FAILED\",\"passed\":${PASS_COUNT},\"warnings\":${WARN_COUNT},\"failed\":${FAIL_COUNT},\"project_ref\":\"${PROJECT_REF}\"}"
  else
    echo -e "${RED}HEALTH_CHECK_STATUS=FAILED${NC}"
  fi
  exit 1
fi

if [[ $JSON_MODE -eq 1 ]]; then
  echo "{\"status\":\"OK\",\"passed\":${PASS_COUNT},\"warnings\":${WARN_COUNT},\"failed\":${FAIL_COUNT},\"project_ref\":\"${PROJECT_REF}\"}"
else
  echo -e "${GREEN}HEALTH_CHECK_STATUS=OK${NC}"
fi
exit 0
