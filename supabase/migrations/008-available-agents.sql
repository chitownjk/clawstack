-- Migration: Add available_agents and account_agents tables
-- Purpose: Let cloud users enable/disable agent capabilities

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
COMMENT ON COLUMN available_agents.required_tier IS 'Minimum plan tier required to enable this agent';
COMMENT ON COLUMN available_agents.required_models IS 'AI models this agent can use';
COMMENT ON COLUMN available_agents.tags IS 'Searchable tags for filtering agents';
