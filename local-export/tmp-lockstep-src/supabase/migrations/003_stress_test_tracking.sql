-- Stress Testing & Audit Trail Columns
-- Adds tracking columns for sweep operations, stake captures, and idempotency

-- Add new columns to commitments table for better tracking
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS stake_captured_at TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS stake_capture_failed_at TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS stake_error_code TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS stake_error_message TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS last_sweep_at TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS last_sweep_request_id TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS failed_at TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS completed_at TEXT;

-- Create audit log table for detailed debugging
CREATE TABLE IF NOT EXISTS commitment_audit_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  commitment_id VARCHAR NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id VARCHAR NOT NULL,
  
  -- Action details
  action TEXT NOT NULL, -- 'create', 'complete', 'fail', 'sweep', 'capture_attempt'
  status_before TEXT,
  status_after TEXT,
  
  -- Stripe details
  stripe_pi_id TEXT,
  stripe_action TEXT, -- 'confirm', 'capture', 'release'
  stripe_error_code TEXT,
  stripe_error_message TEXT,
  
  -- Additional context
  notes TEXT,
  metadata TEXT, -- JSON for extensibility
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
  
  -- Indexing
  CONSTRAINT fk_commitment FOREIGN KEY (commitment_id) REFERENCES commitments(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_commitments_last_sweep_at ON commitments(last_sweep_at);
CREATE INDEX IF NOT EXISTS idx_commitments_stake_captured_at ON commitments(stake_captured_at);
CREATE INDEX IF NOT EXISTS idx_commitment_audit_commitment_id ON commitment_audit_log(commitment_id);
CREATE INDEX IF NOT EXISTS idx_commitment_audit_request_id ON commitment_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_commitment_audit_user_id ON commitment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_commitment_audit_action ON commitment_audit_log(action);

-- Enable RLS
ALTER TABLE commitment_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view own audit logs"
  ON commitment_audit_log FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage audit logs"
  ON commitment_audit_log FOR ALL
  USING (true);
