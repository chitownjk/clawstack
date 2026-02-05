-- Fix jayjk60614@gmail.com account to team tier cloud mode

-- Update the account
UPDATE accounts
SET 
  execution_mode = 'cloud-our-keys',
  plan_tier = 'team',
  onboarding_completed = TRUE,
  features = '{"ai_enabled":true,"task_limit":1000,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":10,"shared_boards":true,"role_permissions":true}'::jsonb
WHERE email = 'jayjk60614@gmail.com';

-- Enable all agents for this account
INSERT INTO account_agents (account_id, agent_id, enabled)
SELECT a.id, ag.id, TRUE
FROM accounts a
CROSS JOIN available_agents ag
WHERE a.email = 'jayjk60614@gmail.com'
ON CONFLICT DO NOTHING;

-- Verify
SELECT 
  email,
  plan_tier,
  execution_mode,
  onboarding_completed,
  (SELECT COUNT(*) FROM account_agents WHERE account_id = accounts.id AND enabled = TRUE) as enabled_agents
FROM accounts
WHERE email = 'jayjk60614@gmail.com';
