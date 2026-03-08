-- ============================================
-- Connection-Aware Actions System
-- Quick actions + workflow templates + execution log
-- ============================================

-- Action templates (seeded defaults + user-created)
CREATE TABLE IF NOT EXISTS mc_action_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id),  -- null = global default
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL,           -- 'quick' | 'workflow'
  service TEXT NOT NULL,            -- 'linkedin', 'twitter', 'gmail', etc.
  required_connections TEXT[],
  form_schema JSONB,                -- field definitions for the action form
  composio_actions TEXT[],          -- ordered list of Composio actions to execute
  ai_prompt_template TEXT,          -- prompt for AI drafting
  workflow_config JSONB,            -- for multi-step: delays, scheduling
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executed action log
CREATE TABLE IF NOT EXISTS mc_executed_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  template_id UUID REFERENCES mc_action_templates(id),
  task_id UUID REFERENCES mc_tasks(id),
  service TEXT NOT NULL,
  action_name TEXT NOT NULL,
  input_data JSONB,
  ai_draft TEXT,
  final_content TEXT,
  status TEXT DEFAULT 'pending',    -- pending, executing, completed, failed, scheduled
  composio_response JSONB,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add action metadata to tasks
ALTER TABLE mc_tasks ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'manual';
ALTER TABLE mc_tasks ADD COLUMN IF NOT EXISTS action_template_id UUID;
ALTER TABLE mc_tasks ADD COLUMN IF NOT EXISTS action_meta JSONB;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_templates_service ON mc_action_templates(service);
CREATE INDEX IF NOT EXISTS idx_action_templates_category ON mc_action_templates(category);
CREATE INDEX IF NOT EXISTS idx_executed_actions_account ON mc_executed_actions(account_id);
CREATE INDEX IF NOT EXISTS idx_executed_actions_status ON mc_executed_actions(status);
CREATE INDEX IF NOT EXISTS idx_executed_actions_scheduled ON mc_executed_actions(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- RLS
ALTER TABLE mc_action_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_executed_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own and default templates" ON mc_action_templates;
CREATE POLICY "Users see own and default templates" ON mc_action_templates
  FOR SELECT USING (
    account_id IS NULL
    OR account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid())
  );

DROP POLICY IF EXISTS "Service role full access templates" ON mc_action_templates;
CREATE POLICY "Service role full access templates" ON mc_action_templates
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users see own executed actions" ON mc_executed_actions;
CREATE POLICY "Users see own executed actions" ON mc_executed_actions
  FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid())
  );

DROP POLICY IF EXISTS "Service role full access executed" ON mc_executed_actions;
CREATE POLICY "Service role full access executed" ON mc_executed_actions
  FOR ALL USING (auth.role() = 'service_role');
