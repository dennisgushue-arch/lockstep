-- Add split balance columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS purchased_credit_balance text NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS earned_credit_balance text NOT NULL DEFAULT '0';

-- Add cashout-related metadata columns to credit_transactions
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS purchased_portion text,
  ADD COLUMN IF NOT EXISTS earned_portion text,
  ADD COLUMN IF NOT EXISTS cashout_request_id varchar,
  ADD COLUMN IF NOT EXISTS usd_amount text;

-- Create cashout requests table
CREATE TABLE IF NOT EXISTS public.cashout_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id varchar NOT NULL REFERENCES public.users(id),
  credits_requested text NOT NULL,
  usd_amount text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payout_method text NOT NULL DEFAULT 'batch',
  requested_at text NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
  processed_at text,
  stripe_payout_id text
);

CREATE INDEX IF NOT EXISTS idx_cashout_requests_status_requested_at
  ON public.cashout_requests (status, requested_at);

CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id
  ON public.cashout_requests (user_id);
