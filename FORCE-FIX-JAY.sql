-- ============================================================
-- FORCE FIX JAY'S ACCOUNT
-- Run this to completely reset Jay's account to proper cloud team tier
-- ============================================================

-- Step 1: Update ALL of Jay's possible email accounts
UPDATE accounts
SET 
  execution_mode = 'cloud-our-keys',
  plan_tier = 'team',
  onboarding_completed = TRUE,
  features = '{"ai_enabled":true,"task_limit":1000,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":10,"shared_boards":true,"role_permissions":true}'::jsonb
WHERE email IN ('jklauminzer@gmail.com', 'jay@solisinteractive.com', 'jay@tiker.com', 'jay@kinuchat.com')
   OR email LIKE '%jklauminzer%'
   OR email LIKE '%jay@%';

-- Step 2: Remove all existing agent enablements for Jay (clean slate)
DELETE FROM account_agents
WHERE account_id IN (
  SELECT id FROM accounts 
  WHERE email IN ('jklauminzer@gmail.com', 'jay@solisinteractive.com', 'jay@tiker.com', 'jay@kinuchat.com')
);

-- Step 3: Enable ALL agents for Jay (team tier gets everything)
INSERT INTO account_agents (account_id, agent_id, enabled)
SELECT a.id, ag.id, TRUE
FROM accounts a
CROSS JOIN available_agents ag
WHERE a.email IN ('jklauminzer@gmail.com', 'jay@solisinteractive.com', 'jay@tiker.com', 'jay@kinuchat.com')
ON CONFLICT DO NOTHING;

-- Step 4: Verify the fix
SELECT 
  email,
  plan_tier,
  execution_mode,
  onboarding_completed,
  (SELECT COUNT(*) FROM account_agents WHERE account_id = accounts.id AND enabled = TRUE) as enabled_agents,
  features->>'ai_enabled' as ai_enabled,
  features->>'task_limit' as task_limit
FROM accounts
WHERE email IN ('jklauminzer@gmail.com', 'jay@solisinteractive.com', 'jay@tiker.com', 'jay@kinuchat.com')
ORDER BY created_at DESC;
