-- Migration: Tier name aliases
-- The Stripe checkout flow uses plan names ('solo', 'developer', 'team') that differ
-- from the canonical DB tier names ('cloud', 'cloud-developer', 'cloud-plus').
-- The webhook handler now normalises names before saving, but this migration updates
-- the DB trigger and helper functions to also handle the Stripe names as aliases,
-- providing a belt-and-suspenders safety net.

-- Update the trigger function to handle both old canonical names and Stripe plan
-- name aliases so features are always populated correctly.
CREATE OR REPLACE FUNCTION update_features_on_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.features :=
    CASE
      -- Free BYOK
      WHEN NEW.plan_tier = 'free' AND NEW.execution_mode = 'cloud-user-keys' THEN
        '{"ai_enabled":true,"task_limit":null,"models":["user_provided"],"api_access":false,"webhooks":false,"team_size":1,"storage_mb":100,"rate_limit_hour":100}'::jsonb
      -- Free
      WHEN NEW.plan_tier = 'free' THEN
        '{"ai_enabled":false,"task_limit":null,"models":[],"team_size":1,"storage_mb":10,"rate_limit_hour":10}'::jsonb
      -- Solo / Pro  (canonical: cloud)
      WHEN NEW.plan_tier IN ('cloud', 'solo', 'pro') THEN
        '{"ai_enabled":true,"task_limit":100,"models":["haiku","sonnet","kimi"],"team_size":1,"storage_mb":500,"rate_limit_hour":200}'::jsonb
      -- Developer  (canonical: cloud-developer)
      WHEN NEW.plan_tier IN ('cloud-developer', 'developer') THEN
        '{"ai_enabled":true,"task_limit":400,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":1,"storage_mb":2048,"rate_limit_hour":500}'::jsonb
      -- Team  (canonical: cloud-plus)
      WHEN NEW.plan_tier IN ('cloud-plus', 'team', 'team_plus') THEN
        '{"ai_enabled":true,"task_limit":1000,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":10,"shared_boards":true,"role_permissions":true,"storage_mb":10240,"rate_limit_hour":1000}'::jsonb
      ELSE
        '{"ai_enabled":false,"team_size":1}'::jsonb
    END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update get_monthly_usage to accept both canonical and alias tier names.
CREATE OR REPLACE FUNCTION get_monthly_usage(account_uuid UUID, month_date DATE DEFAULT CURRENT_DATE)
RETURNS monthly_usage AS $$
DECLARE
  usage_record monthly_usage;
  account_limit INTEGER;
BEGIN
  SELECT
    CASE plan_tier
      WHEN 'cloud'           THEN 100
      WHEN 'solo'            THEN 100
      WHEN 'pro'             THEN 100
      WHEN 'cloud-developer' THEN 400
      WHEN 'developer'       THEN 400
      WHEN 'cloud-plus'      THEN 1000
      WHEN 'team'            THEN 1000
      WHEN 'team_plus'       THEN 1000
      ELSE NULL
    END INTO account_limit
  FROM accounts
  WHERE id = account_uuid;

  INSERT INTO monthly_usage (account_id, month, tasks_limit)
  VALUES (account_uuid, DATE_TRUNC('month', month_date), account_limit)
  ON CONFLICT (account_id, month)
  DO UPDATE SET updated_at = NOW()
  RETURNING * INTO usage_record;

  RETURN usage_record;
END;
$$ LANGUAGE plpgsql;

-- Update increment_task_usage similarly.
CREATE OR REPLACE FUNCTION increment_task_usage(
  account_uuid UUID,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost DECIMAL DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO monthly_usage (account_id, month, tasks_used, tokens_in, tokens_out, cost_usd, tasks_limit)
  VALUES (
    account_uuid,
    DATE_TRUNC('month', CURRENT_DATE),
    1,
    tokens_input,
    tokens_output,
    cost,
    (SELECT CASE plan_tier
       WHEN 'cloud'           THEN 100
       WHEN 'solo'            THEN 100
       WHEN 'pro'             THEN 100
       WHEN 'cloud-developer' THEN 400
       WHEN 'developer'       THEN 400
       WHEN 'cloud-plus'      THEN 1000
       WHEN 'team'            THEN 1000
       WHEN 'team_plus'       THEN 1000
       ELSE NULL
     END FROM accounts WHERE id = account_uuid)
  )
  ON CONFLICT (account_id, month)
  DO UPDATE SET
    tasks_used   = monthly_usage.tasks_used + 1,
    tokens_in    = monthly_usage.tokens_in + tokens_input,
    tokens_out   = monthly_usage.tokens_out + tokens_output,
    cost_usd     = monthly_usage.cost_usd + cost,
    updated_at   = NOW();
END;
$$ LANGUAGE plpgsql;
