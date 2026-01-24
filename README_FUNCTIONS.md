# Supabase Edge Functions (Lockstep)

This folder contains two minimal Supabase Edge Functions:

- `fail_commitment` — POST with `{ "id": "<commitment-id>" }` to mark a single commitment as failed.
- `sweep_overdue_commitments` — scheduled sweep to mark overdue commitments as failed.

They intentionally only update the DB (status = "failed") so you can ship an MVP quickly. Add Stripe capture or other business logic inside the functions later (using SUPABASE_SERVICE_ROLE_KEY and STRIPE_SECRET_KEY as secrets).
