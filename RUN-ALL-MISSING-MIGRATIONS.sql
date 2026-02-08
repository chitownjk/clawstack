-- ============================================================
-- RUN ALL MISSING MIGRATIONS (005 through 008)
-- Run this in Supabase SQL Editor to catch up
-- ============================================================

-- ============================================================
-- 005: Trial Logic & Onboarding
-- ============================================================

-- Add trial tracking columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add onboarding columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_data JSONB;

-- Add stripe subscription columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_trial ON accounts(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_accounts_onboarding ON accounts(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_sub ON accounts(stripe_subscription_id);

-- Comments
COMMENT ON COLUMN accounts.trial_starts_at IS 'When user started their free trial';
COMMENT ON COLUMN accounts.trial_ends_at IS 'When user trial expires';
COMMENT ON COLUMN accounts.onboarding_completed IS 'Whether user finished initial onboarding flow';
COMMENT ON COLUMN accounts.onboarding_step IS 'Current step in onboarding wizard (0-5)';
COMMENT ON COLUMN accounts.onboarding_data IS 'Onboarding selections (preferred model, use cases, etc.)';

-- ============================================================
-- 006: Usage Tracking
-- ============================================================

-- Monthly usage tracking table
CREATE TABLE IF NOT EXISTS monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  month_start DATE NOT NULL, -- First day of the month
  tasks_used INTEGER DEFAULT 0,
  tasks_limit INTEGER,
  tokens_in_used BIGINT DEFAULT 0,
  tokens_out_used BIGINT DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  last_task_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, month_start)
);

-- Task execution details (for usage breakdown)
CREATE TABLE IF NOT EXISTS task_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID, -- Reference to mc_tasks if needed
  model_used TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd DECIMAL(10, 6),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_mode TEXT,
  month_start DATE NOT NULL -- Denormalized for fast queries
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_usage_account ON monthly_usage(account_id);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_month ON monthly_usage(month_start);
CREATE INDEX IF NOT EXISTS idx_task_usage_account_month ON task_usage(account_id, month_start);
CREATE INDEX IF NOT EXISTS idx_task_usage_model ON task_usage(model_used);

-- Comments
COMMENT ON TABLE monthly_usage IS 'Tracks monthly task usage and costs per account';
COMMENT ON TABLE task_usage IS 'Individual task execution details for usage breakdown';

-- ============================================================
-- 007: Feature Flags
-- ============================================================

-- Add features JSONB column to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Helper function: Check if account has a feature
CREATE OR REPLACE FUNCTION has_feature(account_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((features->feature_name)::boolean, FALSE)
  FROM accounts
  WHERE id = account_uuid;
$$ LANGUAGE SQL STABLE;

-- Helper function: Get feature value
CREATE OR REPLACE FUNCTION get_feature(account_uuid UUID, feature_name TEXT)
RETURNS JSONB AS $$
  SELECT features->feature_name
  FROM accounts
  WHERE id = account_uuid;
$$ LANGUAGE SQL STABLE;

-- Helper function: Check if account can use a specific model
CREATE OR REPLACE FUNCTION can_use_model(account_uuid UUID, model_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM accounts
    WHERE id = account_uuid
    AND features->'models' ? model_name
  );
$$ LANGUAGE SQL STABLE;

-- Trigger: Auto-update features when plan_tier changes
CREATE OR REPLACE FUNCTION update_features_on_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update features based on new plan_tier
  NEW.features := CASE NEW.plan_tier
    WHEN 'free' THEN
      CASE NEW.execution_mode
        WHEN 'cloud-user-keys' THEN '{"ai_enabled":true,"task_limit":null,"models":["user_provided"],"team_size":1}'::jsonb
        ELSE '{"ai_enabled":false,"task_limit":null,"team_size":1}'::jsonb
      END
    WHEN 'solo' THEN '{"ai_enabled":true,"task_limit":100,"models":["haiku","sonnet","kimi"],"team_size":1}'::jsonb
    WHEN 'developer' THEN '{"ai_enabled":true,"task_limit":400,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":1}'::jsonb
    WHEN 'team' THEN '{"ai_enabled":true,"task_limit":1000,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":10,"shared_boards":true,"role_permissions":true}'::jsonb
    ELSE '{"ai_enabled":false,"task_limit":null,"team_size":1}'::jsonb
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_features
  BEFORE INSERT OR UPDATE OF plan_tier ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_features_on_tier_change();

-- Backfill features for existing accounts
UPDATE accounts
SET features = CASE plan_tier
  WHEN 'free' THEN
    CASE execution_mode
      WHEN 'cloud-user-keys' THEN '{"ai_enabled":true,"task_limit":null,"models":["user_provided"],"team_size":1}'::jsonb
      ELSE '{"ai_enabled":false,"task_limit":null,"team_size":1}'::jsonb
    END
  WHEN 'solo' THEN '{"ai_enabled":true,"task_limit":100,"models":["haiku","sonnet","kimi"],"team_size":1}'::jsonb
  WHEN 'developer' THEN '{"ai_enabled":true,"task_limit":400,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":1}'::jsonb
  WHEN 'team' THEN '{"ai_enabled":true,"task_limit":1000,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":10,"shared_boards":true,"role_permissions":true}'::jsonb
  ELSE '{"ai_enabled":false,"task_limit":null,"team_size":1}'::jsonb
END
WHERE features = '{}'::jsonb OR features IS NULL;

-- Index for fast feature lookups
CREATE INDEX IF NOT EXISTS idx_accounts_features ON accounts USING GIN(features);

-- ============================================================
-- 008: Available Agents (Agent Enablement)
-- ============================================================

-- Available agents (catalog)
CREATE TABLE IF NOT EXISTS available_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  required_tier TEXT CHECK (required_tier IN ('free', 'solo', 'developer', 'team')),
  required_models TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account-specific agent enablement
CREATE TABLE IF NOT EXISTS account_agents (
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES available_agents(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  PRIMARY KEY (account_id, agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_available_agents_tier ON available_agents(required_tier);
CREATE INDEX IF NOT EXISTS idx_available_agents_tags ON available_agents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_account_agents_account ON account_agents(account_id);
CREATE INDEX IF NOT EXISTS idx_account_agents_enabled ON account_agents(account_id, enabled);

-- Seed available agents
INSERT INTO available_agents (id, name, description, icon, required_tier, required_models, tags) VALUES
('general', 'General Assistant', 'Answer questions, research topics, write drafts, and help with everyday tasks', '🤖', 'free', ARRAY['claude-sonnet', 'gpt4', 'kimi'], ARRAY['general', 'research', 'writing']),
('coder', 'Coder', 'Write code, debug issues, review pull requests, and explain technical concepts', '💻', 'developer', ARRAY['claude-opus', 'gpt4'], ARRAY['coding', 'development', 'technical']),
('data-analyst', 'Data Analyst', 'Analyze data, create visualizations, extract insights, and generate reports', '📊', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['data', 'analysis', 'visualization']),
('writer', 'Writer', 'Create blog posts, documentation, marketing copy, and creative content', '✍️', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['writing', 'content', 'creative']),
('researcher', 'Researcher', 'Deep research with citations, summaries, and fact-checking', '🔍', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['research', 'knowledge', 'education']),
('email-manager', 'Email Manager', 'Draft emails, manage inbox, organize threads, and schedule sends', '📧', 'solo', ARRAY['claude-sonnet'], ARRAY['email', 'productivity', 'communication']),
('calendar-agent', 'Calendar Agent', 'Schedule meetings, manage calendar, send invites, and coordinate availability', '📅', 'solo', ARRAY['claude-sonnet'], ARRAY['calendar', 'scheduling', 'productivity']),
('social-media', 'Social Media Manager', 'Post to Twitter/LinkedIn, engage with audience, schedule content', '📱', 'developer', ARRAY['claude-sonnet', 'gpt4'], ARRAY['social', 'marketing', 'engagement']),
('project-manager', 'Project Manager', 'Track projects, create subtasks, status updates, and team coordination', '📋', 'developer', ARRAY['claude-sonnet'], ARRAY['projects', 'management', 'coordination']),
('translator', 'Translator', 'Translate content across 100+ languages with cultural context', '🌍', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['translation', 'language', 'localization'])
ON CONFLICT (id) DO NOTHING;

-- Enable "General Assistant" for all existing cloud users by default
INSERT INTO account_agents (account_id, agent_id, enabled)
SELECT id, 'general', TRUE
FROM accounts
WHERE execution_mode IN ('cloud-user-keys', 'cloud-our-keys')
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE available_agents IS 'Catalog of agent capabilities that users can enable';
COMMENT ON TABLE account_agents IS 'Which agents each account has enabled';

-- ============================================================
-- DONE! All migrations applied.
-- ============================================================

SELECT 'All migrations (005-008) applied successfully!' AS status;
