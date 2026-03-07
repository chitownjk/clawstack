-- ============================================
-- 017: Agent Comment Attribution
-- Add agent_name column to mc_comments for tracking which agent posted a comment.
-- The existing agent_id FK references mc_agents (runtime state), but the executor
-- uses account_agent_templates IDs, causing FK violations. agent_name provides
-- a reliable, human-readable attribution without FK constraints.
-- ============================================

ALTER TABLE mc_comments
ADD COLUMN IF NOT EXISTS agent_name TEXT;

-- Index for filtering agent vs human comments
CREATE INDEX IF NOT EXISTS idx_mc_comments_agent_name
ON mc_comments(agent_name)
WHERE agent_name IS NOT NULL;
