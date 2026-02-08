-- Manual Storage Setup for mc-files bucket
-- Run this in Supabase SQL Editor after creating the bucket in Dashboard

-- Storage RLS policies for mc-files bucket
-- Users can only access files in their own account folder

CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mc-files' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid())
);

CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mc-files'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid())
);

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mc-files'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid())
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mc-files'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid())
);
