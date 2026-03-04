-- supabase/migrations/006_sources_and_voice_notes.sql

-- Calendar events table
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source_type VARCHAR NOT NULL DEFAULT 'google_calendar',
  external_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  location VARCHAR,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  color VARCHAR,
  is_busy BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, external_id, source_type)
);

CREATE INDEX idx_calendar_events_user_time ON calendar_events(user_id, start_time DESC);
CREATE INDEX idx_calendar_events_busy ON calendar_events(user_id, is_busy) WHERE is_busy = true;

-- Voice notes table
CREATE TABLE voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  audio_path VARCHAR NOT NULL, -- Supabase storage path
  duration_seconds INT,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  
  -- Transcription
  transcription TEXT,
  transcription_model VARCHAR,
  transcribed_at TIMESTAMPTZ,
  
  -- AI Extraction
  extracted_intent VARCHAR,
  emotion VARCHAR, -- "urgent", "uncertain", "excited", "scared"
  obstacles JSONB, -- Array of obstacles
  suggested_stake INT,
  suggested_deadline TIMESTAMPTZ,
  difficulty_estimate INT, -- 1-5
  category VARCHAR, -- "health", "work", "relationships", etc.
  
  -- User action
  created_commitment_id UUID REFERENCES commitments(id) ON DELETE SET NULL,
  dismissed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_notes_user_date ON voice_notes(user_id, recorded_at DESC);
CREATE INDEX idx_voice_notes_pending ON voice_notes(user_id, created_commitment_id) 
  WHERE created_commitment_id IS NULL AND dismissed_at IS NULL;

-- Shared messages table
CREATE TABLE shared_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source_type VARCHAR NOT NULL, -- "sms", "imessage", "slack", "email"
  content TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  
  -- AI extraction
  extracted_intent VARCHAR,
  context_category VARCHAR, -- "work", "health", "relationships", "personal"
  sentiment VARCHAR, -- "positive", "negative", "urgent"
  suggested_stake INT,
  suggested_deadline TIMESTAMPTZ,
  
  -- User action
  created_commitment_id UUID REFERENCES commitments(id) ON DELETE SET NULL,
  dismissed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shared_messages_user ON shared_messages(user_id, created_at DESC);
CREATE INDEX idx_shared_messages_pending ON shared_messages(user_id, created_commitment_id) 
  WHERE created_commitment_id IS NULL AND dismissed_at IS NULL;

-- User source connections (OAuth tokens, settings)
CREATE TABLE user_source_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source_type VARCHAR NOT NULL, -- "google_calendar", "email", etc.
  is_connected BOOLEAN DEFAULT true,
  oauth_token_encrypted VARCHAR, -- Store encrypted OAuth token
  oauth_refresh_token_encrypted VARCHAR,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_status VARCHAR DEFAULT 'idle', -- "idle", "syncing", "error"
  sync_error_message TEXT,
  
  -- Settings
  auto_sync BOOLEAN DEFAULT true,
  sync_frequency_minutes INT DEFAULT 60, -- Sync every hour
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, source_type)
);

CREATE INDEX idx_user_source_connections ON user_source_connections(user_id, is_connected);

-- Daily check-in responses
CREATE TABLE checkin_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  
  -- Responses
  avoided TEXT,
  scared TEXT,
  tomorrow TEXT,
  
  -- AI extraction
  extracted_commitments JSONB, -- Array of extracted commitments
  suggested_stakes JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX idx_checkin_responses_user ON checkin_responses(user_id, checkin_date DESC);

-- AI recommendation history (for learning + debugging)
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source_id UUID, -- Reference to voice_note, message, or checkin
  source_type VARCHAR NOT NULL, -- "voice_note", "message", "checkin"
  
  -- What was recommended
  suggested_wording TEXT,
  suggested_stake INT,
  suggested_deadline TIMESTAMPTZ,
  suggested_category VARCHAR,
  verification_method VARCHAR, -- "manual", "calendar", "voice", "checkin"
  risk_factors JSONB,
  confidence_score FLOAT,
  
  -- User's action
  was_accepted BOOLEAN,
  accepted_with_changes BOOLEAN DEFAULT false,
  created_commitment_id UUID REFERENCES commitments(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  feedback_provided_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_recommendations_user ON ai_recommendations(user_id, created_at DESC);
CREATE INDEX idx_ai_recommendations_feedback ON ai_recommendations(user_id) 
  WHERE was_accepted IS NOT NULL;
