-- Check Jay's account current state
SELECT 
  id,
  email,
  name,
  plan_tier,
  execution_mode,
  trial_starts_at,
  trial_ends_at,
  onboarding_completed,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  features,
  created_at
FROM accounts
WHERE email IN ('jklauminzer@gmail.com', 'jay@solisinteractive.com', 'jay@tiker.com', 'jay@kinuchat.com')
ORDER BY created_at DESC;

-- Check enabled agents
SELECT 
  a.email,
  COUNT(aa.agent_id) as enabled_agent_count,
  STRING_AGG(aa.agent_id, ', ') as enabled_agents
FROM accounts a
LEFT JOIN account_agents aa ON a.id = aa.account_id AND aa.enabled = TRUE
WHERE a.email IN ('jklauminzer@gmail.com', 'jay@solisinteractive.com', 'jay@tiker.com', 'jay@kinuchat.com')
GROUP BY a.email;
