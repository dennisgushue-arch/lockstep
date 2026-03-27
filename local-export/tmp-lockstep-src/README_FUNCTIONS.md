# Supabase Edge Functions (Lockstep)

This folder contains Supabase Edge Functions used by Lockstep.

Key endpoints:
- `fail_commitment` — POST with `{ "commitmentId": "<commitment-id>" }` to mark a commitment as missed. If `SWEEP_SECRET` is configured, include `x-sweep-secret`.
- `sweep_overdue_commitments` — scheduled sweep to mark overdue commitments as missed (uses `SWEEP_SECRET`).
- `create_commitment`, `complete_commitment`, `stress_test_gen`, `sync_input_sources`, `sync_google_calendar`, `exchange_calendar_token`, `transcribe_voice_note`, `extract_intent_from_voice`, `analyze_intent`.

Required secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SWEEP_SECRET` (for sweeps)
- `STRIPE_SECRET_KEY` (for credit purchase confirmation)
- `OPENAI_API_KEY` (voice transcription)
- `ANTHROPIC_API_KEY` (voice intent extraction)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (calendar OAuth)
- `TOKEN_ENCRYPTION_KEY` (32-byte base64, used to encrypt OAuth tokens). Generate via `node scripts/generate_token_key.mjs`.
