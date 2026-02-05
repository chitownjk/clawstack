-- ============================================================
-- FIX EXISTING ACCOUNTS
-- Run this AFTER running RUN-ALL-MISSING-MIGRATIONS.sql
-- ============================================================

-- Set execution_mode for accounts that don't have it set
-- Default to 'cloud-our-keys' (paid cloud tier)
UPDATE accounts
SET execution_mode = 'cloud-our-keys'
WHERE execution_mode IS NULL;

-- Fix Jay's account specifically (set to team tier, cloud mode)
UPDATE accounts
SET 
  execution_mode = 'cloud-our-keys',
  plan_tier = 'team',
  onboarding_completed = TRUE
WHERE email = 'jklauminzer@gmail.com' OR email LIKE '%@tiker.com' OR email LIKE '%@solisinteractive.com';

-- Enable all agents for team tier users
INSERT INTO account_agents (account_id, agent_id, enabled)
SELECT a.id, ag.id, TRUE
FROM accounts a
CROSS JOIN available_agents ag
WHERE a.plan_tier = 'team'
ON CONFLICT DO NOTHING;

-- If you want to set specific accounts to different modes:

-- Set to BYOK (replace email)
-- UPDATE accounts
-- SET execution_mode = 'cloud-user-keys', plan_tier = 'free'
-- WHERE email = 'your-email@example.com';

-- Set to self-hosted
-- UPDATE accounts
-- SET execution_mode = 'openclaw', plan_tier = 'free'
-- WHERE email = 'self-hosted-user@example.com';

-- ============================================================
-- VERIFY
-- ============================================================

SELECT 
  email, 
  plan_tier, 
  execution_mode, 
  onboarding_completed,
  (SELECT COUNT(*) FROM account_agents WHERE account_id = accounts.id AND enabled = TRUE) as enabled_agents
FROM accounts
ORDER BY created_at DESC
LIMIT 10;
