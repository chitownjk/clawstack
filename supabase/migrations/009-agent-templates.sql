-- Migration: Unify agent system with account_agent_templates
-- Purpose: Single source of truth for agent configs (OSS + cloud)

-- Account agent templates (configured agent instances)
CREATE TABLE IF NOT EXISTS account_agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES available_agents(id),
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🤖',
  personality TEXT,  -- Custom instructions/system prompt
  model_tier TEXT DEFAULT 'standard' CHECK (model_tier IN ('fast', 'standard', 'reasoning')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, agent_id, name)  -- Allow multiple instances of same agent type
);

CREATE INDEX IF NOT EXISTS idx_account_agent_templates_account ON account_agent_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_account_agent_templates_agent ON account_agent_templates(agent_id);

-- Migrate existing mc_agents to account_agent_templates
-- Map mc_agents.id (like 'general', 'calendar-agent') to available_agents
INSERT INTO account_agent_templates (id, account_id, agent_id, name, emoji, personality, model_tier)
SELECT 
  gen_random_uuid() as id,
  mc_agents.account_id,
  CASE 
    -- Map old IDs to available_agents IDs
    WHEN mc_agents.id = 'general' THEN 'general'
    WHEN mc_agents.id = 'calendar-agent' THEN 'calendar-agent'
    WHEN mc_agents.id = 'coder' THEN 'coder'
    WHEN mc_agents.id = 'researcher' THEN 'researcher'
    WHEN mc_agents.id = 'writer' THEN 'writer'
    -- Default to 'general' for unknown agent types
    ELSE 'general'
  END as agent_id,
  mc_agents.name,
  mc_agents.emoji,
  mc_agents.role as personality,
  'standard' as model_tier
FROM mc_agents
WHERE NOT EXISTS (
  SELECT 1 FROM account_agent_templates 
  WHERE account_agent_templates.account_id = mc_agents.account_id 
  AND account_agent_templates.name = mc_agents.name
);

-- Update mc_tasks.assigned_agent_ids to use new UUIDs
-- This is tricky because we're changing from text IDs to UUIDs
-- For now, we'll create a mapping table

CREATE TABLE IF NOT EXISTS agent_id_mapping (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL,
  account_id UUID NOT NULL
);

-- Populate mapping from mc_agents → account_agent_templates
INSERT INTO agent_id_mapping (old_id, new_id, account_id)
SELECT 
  mc_agents.id as old_id,
  aat.id as new_id,
  mc_agents.account_id
FROM mc_agents
JOIN account_agent_templates aat ON 
  aat.account_id = mc_agents.account_id 
  AND aat.name = mc_agents.name
ON CONFLICT (old_id) DO UPDATE SET new_id = EXCLUDED.new_id;

-- Function to migrate task agent IDs
CREATE OR REPLACE FUNCTION migrate_task_agent_ids()
RETURNS void AS $$
DECLARE
  task_record RECORD;
  old_agent_id TEXT;
  new_agent_ids UUID[];
  mapping_record RECORD;
BEGIN
  FOR task_record IN SELECT id, assigned_agent_ids, account_id FROM mc_tasks WHERE assigned_agent_ids IS NOT NULL AND array_length(assigned_agent_ids, 1) > 0 LOOP
    new_agent_ids := ARRAY[]::UUID[];
    
    FOREACH old_agent_id IN ARRAY task_record.assigned_agent_ids::TEXT[] LOOP
      -- Try to find mapping
      SELECT new_id INTO mapping_record FROM agent_id_mapping 
      WHERE old_id = old_agent_id AND account_id = task_record.account_id;
      
      IF FOUND THEN
        new_agent_ids := array_append(new_agent_ids, mapping_record.new_id);
      ELSE
        -- If no mapping, try to find any agent for this account
        SELECT id INTO mapping_record FROM account_agent_templates 
        WHERE account_id = task_record.account_id 
        LIMIT 1;
        
        IF FOUND THEN
          new_agent_ids := array_append(new_agent_ids, mapping_record.id);
        END IF;
      END IF;
    END LOOP;
    
    -- Update task with new agent IDs
    IF array_length(new_agent_ids, 1) > 0 THEN
      UPDATE mc_tasks SET assigned_agent_ids = new_agent_ids WHERE id = task_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration (commented out for safety - run manually)
-- SELECT migrate_task_agent_ids();

-- RLS policies
ALTER TABLE account_agent_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own agent templates" ON account_agent_templates;
CREATE POLICY "Users manage own agent templates" ON account_agent_templates
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Service role agent templates" ON account_agent_templates;
CREATE POLICY "Service role agent templates" ON account_agent_templates 
  FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE account_agent_templates IS 'User-configured agent instances with custom personalities and model tiers';
COMMENT ON COLUMN account_agent_templates.agent_id IS 'Reference to available_agents catalog';
COMMENT ON COLUMN account_agent_templates.personality IS 'Custom system prompt/instructions for this agent';
COMMENT ON COLUMN account_agent_templates.model_tier IS 'Model capability tier: fast (Haiku), standard (Sonnet/Kimi), reasoning (Opus)';

-- Keep mc_agents for runtime state only (status, heartbeat, current_task)
-- Or we could deprecate it and add those fields to account_agent_templates
-- For now, keep both tables
