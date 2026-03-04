-- Create audio_files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio_files', 'audio_files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload audio files
CREATE POLICY "Users can upload their own audio files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own audio files
CREATE POLICY "Users can read their own audio files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own audio files
CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
