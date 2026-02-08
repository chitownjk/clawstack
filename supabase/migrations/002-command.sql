-- ============================================
-- TIKER: Command Center Schema
-- Run AFTER 001-accounts.sql
-- ============================================

-- ============================================
-- MC_AGENTS (agent profiles for Command UI)
-- ============================================
CREATE TABLE IF NOT EXISTS mc_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_key TEXT NOT NULL,
  role TEXT NOT NULL,
  level TEXT DEFAULT 'specialist',  -- intern, specialist, lead
  emoji TEXT DEFAULT '🤖',
  avatar_url TEXT,
  status TEXT DEFAULT 'idle',  -- idle, active, blocked
  current_task_id UUID,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, session_key)
);

CREATE INDEX IF NOT EXISTS idx_mc_agents_account ON mc_agents(account_id);
CREATE INDEX IF NOT EXISTS idx_mc_agents_session ON mc_agents(session_key);

-- ============================================
-- MC_TASKS (kanban cards)
-- ============================================
CREATE TABLE IF NOT EXISTS mc_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,  -- Encrypted
  description TEXT,     -- Encrypted
  status TEXT DEFAULT 'inbox',  -- inbox, assigned, in_progress, review, done, blocked
  assigned_agent_ids UUID[] DEFAULT '{}',
  created_by_agent_id UUID REFERENCES mc_agents(id),
  tags TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'normal',  -- low, normal, high, urgent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mc_tasks_account ON mc_tasks(account_id);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_status ON mc_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_created ON mc_tasks(created_at DESC);

-- ============================================
-- MC_COMMENTS (task comments)
-- ============================================
CREATE TABLE IF NOT EXISTS mc_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES mc_tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES mc_agents(id),
  content TEXT NOT NULL,  -- Encrypted
  mentions JSONB DEFAULT '[]',  -- [{type, id, name}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mc_comments_account ON mc_comments(account_id);
CREATE INDEX IF NOT EXISTS idx_mc_comments_task ON mc_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_mc_comments_mentions ON mc_comments USING GIN(mentions);

-- ============================================
-- MC_ACTIVITIES (activity feed)
-- ============================================
CREATE TABLE IF NOT EXISTS mc_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES mc_agents(id),
  type TEXT NOT NULL,  -- heartbeat, task_created, task_updated, comment, status_change, etc.
  message TEXT NOT NULL,
  task_id UUID REFERENCES mc_tasks(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mc_activities_account ON mc_activities(account_id);
CREATE INDEX IF NOT EXISTS idx_mc_activities_created ON mc_activities(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on tasks
CREATE OR REPLACE FUNCTION update_mc_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mc_task_timestamp ON mc_tasks;
CREATE TRIGGER trigger_update_mc_task_timestamp
BEFORE UPDATE ON mc_tasks
FOR EACH ROW
EXECUTE FUNCTION update_mc_task_timestamp();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE mc_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_activities ENABLE ROW LEVEL SECURITY;

-- Users manage their own data
DROP POLICY IF EXISTS "Users manage own mc_agents" ON mc_agents;
CREATE POLICY "Users manage own mc_agents" ON mc_agents
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Users manage own mc_tasks" ON mc_tasks;
CREATE POLICY "Users manage own mc_tasks" ON mc_tasks
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Users manage own mc_comments" ON mc_comments;
CREATE POLICY "Users manage own mc_comments" ON mc_comments
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Users view own mc_activities" ON mc_activities;
CREATE POLICY "Users view own mc_activities" ON mc_activities
  FOR SELECT USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

-- Service role bypass
DROP POLICY IF EXISTS "Service role mc_agents" ON mc_agents;
CREATE POLICY "Service role mc_agents" ON mc_agents FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role mc_tasks" ON mc_tasks;
CREATE POLICY "Service role mc_tasks" ON mc_tasks FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role mc_comments" ON mc_comments;
CREATE POLICY "Service role mc_comments" ON mc_comments FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role mc_activities" ON mc_activities;
CREATE POLICY "Service role mc_activities" ON mc_activities FOR ALL USING (auth.role() = 'service_role');
