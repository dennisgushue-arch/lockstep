# Supabase Edge Functions (Lockstep)

This folder contains two Supabase Edge Functions:

- `fail_commitment` — POST with `{ "commitmentId": "<commitment-id>" }` (or `{ "commitment_id": "..." }`) to mark a single commitment as failed.
- `sweep_overdue_commitments` — scheduled sweep to find active commitments past their deadline and call `fail_commitment` for each one.

## Authentication

`sweep_overdue_commitments` is protected by a shared secret. The caller must send either:
- `x-sweep-secret: <SWEEP_SECRET>` header, or
- `x-cron-secret: <SWEEP_SECRET>` header

Set `SWEEP_SECRET` as both a Supabase secret (for the function) and a GitHub Actions secret (for the cron workflow).

## Required Supabase Secrets

| Name | Description |
|------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Used by `fail_commitment` for admin DB access |
| `SERVICE_ROLE_KEY` | Used by `sweep_overdue_commitments` for admin DB access — set this to the same value as `SUPABASE_SERVICE_ROLE_KEY` |
| `SWEEP_SECRET` | Shared secret to authenticate the cron caller |

## Required GitHub Actions Secrets

| Name | Description |
|------|-------------|
| `SUPABASE_PROJECT_REF` | Your Supabase project reference ID (e.g. `abcdefghijklmnop`) |
| `SWEEP_SECRET` | Must match the `SWEEP_SECRET` set in Supabase |

## Deploy

```bash
supabase functions deploy fail_commitment
supabase functions deploy sweep_overdue_commitments
```

Set secrets:
```bash
supabase secrets set SWEEP_SECRET=<your-secret>
supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>
```

They intentionally only update the DB (`status = "missed"`) so you can ship an MVP quickly. Add Stripe capture or other business logic inside the functions later (using `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` as secrets).
