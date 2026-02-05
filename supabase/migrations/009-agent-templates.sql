-- Migration: Unify agent system with account_agent_templates
-- Purpose: Single source of truth for agent configs (OSS + cloud)

-- Drop and recreate to ensure clean state
DROP TABLE IF EXISTS account_agent_templates CASCADE;

-- Account agent templates (configured agent instances)
CREATE TABLE account_agent_templates (
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

CREATE INDEX idx_account_agent_templates_account ON account_agent_templates(account_id);
CREATE INDEX idx_account_agent_templates_agent ON account_agent_templates(agent_id);

-- Create default agent instances for all accounts
-- Use account_agents.enabled to see which agents each account should have
INSERT INTO account_agent_templates (account_id, agent_id, name, emoji, personality, model_tier)
SELECT 
  aa.account_id,
  aa.agent_id,
  av.name,  -- Use the agent's display name
  av.icon,
  NULL as personality,  -- No custom personality yet
  CASE 
    WHEN 'claude-opus' = ANY(av.required_models) THEN 'reasoning'
    WHEN av.id IN ('general', 'data-analyst', 'writer', 'researcher', 'translator') THEN 'standard'
    ELSE 'standard'
  END as model_tier
FROM account_agents aa
JOIN available_agents av ON av.id = aa.agent_id
WHERE aa.enabled = TRUE
ON CONFLICT (account_id, agent_id, name) DO NOTHING;

-- If no agents exist for an account, create a default General Assistant
INSERT INTO account_agent_templates (account_id, agent_id, name, emoji, personality, model_tier)
SELECT 
  a.id as account_id,
  'general' as agent_id,
  'General Assistant' as name,
  '🤖' as emoji,
  NULL as personality,
  'standard' as model_tier
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM account_agent_templates 
  WHERE account_agent_templates.account_id = a.id
)
ON CONFLICT (account_id, agent_id, name) DO NOTHING;

-- RLS policies
ALTER TABLE account_agent_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent templates" ON account_agent_templates
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

CREATE POLICY "Service role agent templates" ON account_agent_templates 
  FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE account_agent_templates IS 'User-configured agent instances with custom personalities and model tiers';
COMMENT ON COLUMN account_agent_templates.agent_id IS 'Reference to available_agents catalog';
COMMENT ON COLUMN account_agent_templates.personality IS 'Custom system prompt/instructions for this agent';
COMMENT ON COLUMN account_agent_templates.model_tier IS 'Model capability tier: fast (Haiku), standard (Sonnet/Kimi), reasoning (Opus)';

-- Note: mc_agents table remains for runtime state (status, heartbeat, current_task)
-- account_agent_templates is configuration/templates, mc_agents is runtime instances
