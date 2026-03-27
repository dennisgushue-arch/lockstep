-- Add action_text column to commitments
-- Stores the current action/first step for the pact

ALTER TABLE commitments
  ADD COLUMN IF NOT EXISTS action_text TEXT;

CREATE INDEX IF NOT EXISTS idx_commitments_action_text ON commitments(action_text);
