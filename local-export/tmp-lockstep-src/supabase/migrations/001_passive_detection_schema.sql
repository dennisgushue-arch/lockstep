-- Passive Detection Schema Migration
-- Creates tables for intent signals, patterns, and input sources

-- Intent Signals: Raw captures from various sources
CREATE TABLE IF NOT EXISTS intent_signals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT,
  raw_text TEXT NOT NULL,
  detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
  normalized_intent TEXT,
  category TEXT,
  confidence TEXT,
  processed TEXT NOT NULL DEFAULT 'false'
);

-- Intent Patterns: Detected repeated behaviors
CREATE TABLE IF NOT EXISTS intent_patterns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  normalized_intent TEXT NOT NULL,
  category TEXT NOT NULL,
  first_detected_at TEXT NOT NULL,
  last_detected_at TEXT NOT NULL,
  occurrence_count TEXT NOT NULL DEFAULT '1',
  day_span TEXT NOT NULL DEFAULT '1',
  status TEXT NOT NULL DEFAULT 'active',
  suggested_stake TEXT,
  related_signal_ids TEXT
);

-- Input Sources: Connected data sources
CREATE TABLE IF NOT EXISTS input_sources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  connected TEXT NOT NULL DEFAULT 'false',
  auth_token TEXT,
  last_sync_at TEXT,
  settings TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_intent_signals_user_id ON intent_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_signals_processed ON intent_signals(processed);
CREATE INDEX IF NOT EXISTS idx_intent_patterns_user_id ON intent_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_patterns_status ON intent_patterns(status);
CREATE INDEX IF NOT EXISTS idx_input_sources_user_id ON input_sources(user_id);

-- Enable RLS
ALTER TABLE intent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE input_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view own intent signals"
  ON intent_signals FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own intent signals"
  ON intent_signals FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own intent patterns"
  ON intent_patterns FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own intent patterns"
  ON intent_patterns FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own input sources"
  ON input_sources FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own input sources"
  ON input_sources FOR ALL
  USING (auth.uid()::text = user_id);
