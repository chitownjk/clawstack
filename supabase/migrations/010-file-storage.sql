-- Migration: File Storage for Command
-- Purpose: Store agent outputs, attachments, large content

-- File metadata table
CREATE TABLE IF NOT EXISTS mc_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID REFERENCES mc_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL, -- Storage path: {account_id}/{year}/{month}/{task_id?}/{filename}
  size_bytes BIGINT NOT NULL,
  mime_type TEXT,
  uploaded_by_agent_id UUID REFERENCES account_agent_templates(id),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, path)
);

CREATE INDEX IF NOT EXISTS idx_mc_files_account ON mc_files(account_id);
CREATE INDEX IF NOT EXISTS idx_mc_files_task ON mc_files(task_id);
CREATE INDEX IF NOT EXISTS idx_mc_files_agent ON mc_files(uploaded_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_mc_files_created ON mc_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mc_files_metadata ON mc_files USING GIN(metadata);

-- Function to get account's total storage usage
CREATE OR REPLACE FUNCTION get_storage_usage(account_uuid UUID)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(size_bytes), 0)
  FROM mc_files
  WHERE account_id = account_uuid;
$$ LANGUAGE SQL STABLE;

-- Function to check if account is over storage limit
CREATE OR REPLACE FUNCTION is_over_storage_limit(account_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage BIGINT;
  account_limit BIGINT;
  account_tier TEXT;
BEGIN
  -- Get current usage
  current_usage := get_storage_usage(account_uuid);
  
  -- Get account tier and determine limit
  SELECT plan_tier INTO account_tier
  FROM accounts
  WHERE id = account_uuid;
  
  -- Set limits based on tier
  account_limit := CASE account_tier
    WHEN 'free' THEN 104857600      -- 100MB
    WHEN 'solo' THEN 1073741824     -- 1GB
    WHEN 'developer' THEN 10737418240  -- 10GB
    WHEN 'team' THEN 10737418240       -- 10GB
    ELSE 104857600  -- Default to free tier
  END;
  
  RETURN current_usage >= account_limit;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE mc_files ENABLE ROW LEVEL SECURITY;

-- Users can only see their own files
DROP POLICY IF EXISTS "Users view own files" ON mc_files;
CREATE POLICY "Users view own files" ON mc_files
  FOR SELECT USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

-- Users can insert their own files (if not over limit)
DROP POLICY IF EXISTS "Users upload own files" ON mc_files;
CREATE POLICY "Users upload own files" ON mc_files
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid())
    AND NOT is_over_storage_limit(account_id)
  );

-- Users can delete their own files
DROP POLICY IF EXISTS "Users delete own files" ON mc_files;
CREATE POLICY "Users delete own files" ON mc_files
  FOR DELETE USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

-- Service role bypass
DROP POLICY IF EXISTS "Service role mc_files" ON mc_files;
CREATE POLICY "Service role mc_files" ON mc_files 
  FOR ALL USING (auth.role() = 'service_role');

-- Storage bucket policies (to be created via Supabase dashboard or API)
-- Bucket name: mc-files
-- RLS: Enabled
-- Policies:
--   1. Users can upload to their own folder: account_id/{year}/{month}/**
--   2. Users can read from their own folder: account_id/{year}/{month}/**
--   3. Users can delete from their own folder: account_id/{year}/{month}/**

-- Comments
COMMENT ON TABLE mc_files IS 'File metadata for agent outputs and user attachments';
COMMENT ON COLUMN mc_files.path IS 'Relative path in Supabase Storage bucket';
COMMENT ON COLUMN mc_files.uploaded_by_agent_id IS 'Agent that created this file (NULL if human uploaded)';
COMMENT ON COLUMN mc_files.metadata IS 'Additional file metadata (tags, agent notes, etc.)';
COMMENT ON FUNCTION get_storage_usage IS 'Calculate total storage used by account in bytes';
COMMENT ON FUNCTION is_over_storage_limit IS 'Check if account has exceeded storage quota for their tier';
