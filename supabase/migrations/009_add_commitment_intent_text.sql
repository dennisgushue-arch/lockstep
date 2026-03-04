-- Add intent_text column to commitments
-- Stores the user’s commitment text at creation time

ALTER TABLE commitments
  ADD COLUMN IF NOT EXISTS intent_text TEXT;

CREATE INDEX IF NOT EXISTS idx_commitments_intent_text ON commitments(intent_text);
