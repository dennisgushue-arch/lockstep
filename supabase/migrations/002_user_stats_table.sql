-- User Stats Table Migration
-- Tracks user statistics and achievements

-- User Stats: Track user progress and statistics
CREATE TABLE IF NOT EXISTS user_stats (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Commitment stats
  total_commitments_created TEXT NOT NULL DEFAULT '0',
  total_commitments_completed TEXT NOT NULL DEFAULT '0',
  total_commitments_failed TEXT NOT NULL DEFAULT '0',
  current_streak TEXT NOT NULL DEFAULT '0',
  longest_streak TEXT NOT NULL DEFAULT '0',
  
  -- Credit stats
  total_credits_spent TEXT NOT NULL DEFAULT '0',
  total_credits_earned TEXT NOT NULL DEFAULT '0',
  total_credits_refunded TEXT NOT NULL DEFAULT '0',
  
  -- Timing stats
  last_commitment_at TEXT,
  last_completion_at TEXT,
  last_failure_at TEXT,
  
  -- Optional perks (for future use)
  perks TEXT DEFAULT '{}',
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage all stats"
  ON user_stats FOR ALL
  USING (true);

-- Function to initialize user stats with defaults
CREATE OR REPLACE FUNCTION initialize_user_stats(p_user_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user_stats when a user is created
CREATE OR REPLACE FUNCTION auto_create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_create_user_stats'
  ) THEN
    CREATE TRIGGER trigger_auto_create_user_stats
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION auto_create_user_stats();
  END IF;
END $$;
