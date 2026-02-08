-- ============================================================
-- CLEANUP: Remove auto-enabled agents, keep only General
-- ============================================================

-- Step 1: Verify current state
SELECT 
  email,
  execution_mode,
  plan_tier,
  (SELECT COUNT(*) FROM account_agents WHERE account_id = accounts.id AND enabled = TRUE) as enabled_count
FROM accounts
WHERE email = 'jayjk60614@gmail.com';

-- Step 2: Remove all enabled agents for this account
DELETE FROM account_agents
WHERE account_id = (SELECT id FROM accounts WHERE email = 'jayjk60614@gmail.com');

-- Step 3: Enable ONLY General Assistant
INSERT INTO account_agents (account_id, agent_id, enabled)
SELECT id, 'general', TRUE
FROM accounts
WHERE email = 'jayjk60614@gmail.com';

-- Step 4: Verify cleanup
SELECT 
  email,
  execution_mode,
  plan_tier,
  (SELECT COUNT(*) FROM account_agents WHERE account_id = accounts.id AND enabled = TRUE) as enabled_count,
  (SELECT STRING_AGG(agent_id, ', ') FROM account_agents WHERE account_id = accounts.id AND enabled = TRUE) as enabled_agents
FROM accounts
WHERE email = 'jayjk60614@gmail.com';

-- Step 5: Also clean up the team tier accounts (should only have General enabled by default)
DELETE FROM account_agents
WHERE account_id IN (
  SELECT id FROM accounts 
  WHERE email IN ('jklauminzer@gmail.com', 'jay@solisinteractive.com')
);

INSERT INTO account_agents (account_id, agent_id, enabled)
SELECT id, 'general', TRUE
FROM accounts
WHERE email IN ('jklauminzer@gmail.com', 'jay@solisinteractive.com');

-- Final verification
SELECT 
  email,
  (SELECT COUNT(*) FROM account_agents WHERE account_id = accounts.id AND enabled = TRUE) as enabled_count
FROM accounts
WHERE email IN ('jayjk60614@gmail.com', 'jklauminzer@gmail.com', 'jay@solisinteractive.com')
ORDER BY email;
