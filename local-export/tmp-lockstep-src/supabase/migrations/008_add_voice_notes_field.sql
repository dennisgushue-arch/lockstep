-- Add field to track if voice note has been converted to commitment
ALTER TABLE voice_notes
ADD COLUMN IF NOT EXISTS created_as_commitment BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_voice_notes_created_as_commitment
ON voice_notes(user_id, created_as_commitment);
