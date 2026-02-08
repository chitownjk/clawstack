-- ============================================
-- 015: External Email Participants
-- Add support for external users participating via email
-- ============================================

-- Add external_author_email to mc_comments
-- This allows non-Tiker users to reply to task emails
-- and have their comments threaded properly
ALTER TABLE mc_comments 
ADD COLUMN IF NOT EXISTS external_author_email TEXT;

-- Add external_author_name for display purposes
ALTER TABLE mc_comments 
ADD COLUMN IF NOT EXISTS external_author_name TEXT;

-- Index for lookups by external email
CREATE INDEX IF NOT EXISTS idx_mc_comments_external_email 
ON mc_comments(external_author_email) 
WHERE external_author_email IS NOT NULL;

-- ============================================
-- MC_EXTERNAL_PARTICIPANTS
-- Track external users who participate in tasks
-- ============================================
CREATE TABLE IF NOT EXISTS mc_external_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES mc_tasks(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  comment_count INTEGER DEFAULT 0,
  
  UNIQUE(task_id, email)
);

CREATE INDEX IF NOT EXISTS idx_external_participants_task ON mc_external_participants(task_id);
CREATE INDEX IF NOT EXISTS idx_external_participants_email ON mc_external_participants(email);
CREATE INDEX IF NOT EXISTS idx_external_participants_account ON mc_external_participants(account_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE mc_external_participants ENABLE ROW LEVEL SECURITY;

-- Users manage their own external participants
DROP POLICY IF EXISTS "Users manage own mc_external_participants" ON mc_external_participants;
CREATE POLICY "Users manage own mc_external_participants" ON mc_external_participants
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

-- Service role bypass
DROP POLICY IF EXISTS "Service role mc_external_participants" ON mc_external_participants;
CREATE POLICY "Service role mc_external_participants" ON mc_external_participants 
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- TRIGGER: Auto-update last_activity
-- ============================================

CREATE OR REPLACE FUNCTION update_external_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new comment from external user is added
  IF NEW.external_author_email IS NOT NULL THEN
    -- Update or insert external participant record
    INSERT INTO mc_external_participants (
      account_id,
      task_id,
      email,
      name,
      last_activity,
      comment_count
    ) VALUES (
      NEW.account_id,
      NEW.task_id,
      NEW.external_author_email,
      NEW.external_author_name,
      NOW(),
      1
    )
    ON CONFLICT (task_id, email) DO UPDATE SET
      last_activity = NOW(),
      comment_count = mc_external_participants.comment_count + 1,
      name = COALESCE(EXCLUDED.name, mc_external_participants.name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_external_participant ON mc_comments;
CREATE TRIGGER trigger_update_external_participant
AFTER INSERT ON mc_comments
FOR EACH ROW
EXECUTE FUNCTION update_external_participant_activity();
