-- Migration: Feature Flags
-- Map each tier to specific features

-- Add features column
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Set default features based on current plan_tier
UPDATE accounts SET features = 
  CASE 
    -- Free BYOK (cloud-user-keys)
    WHEN plan_tier = 'free' AND execution_mode = 'cloud-user-keys' THEN 
      '{
        "ai_enabled": true,
        "task_limit": null,
        "models": ["user_provided"],
        "api_access": false,
        "webhooks": false,
        "custom_agents": false,
        "priority_queue": false,
        "team_size": 1,
        "shared_boards": false,
        "storage_mb": 100,
        "rate_limit_hour": 100
      }'::jsonb
    
    -- Free No-AI (openclaw or no execution mode)
    WHEN plan_tier = 'free' THEN 
      '{
        "ai_enabled": false,
        "task_limit": null,
        "models": [],
        "api_access": false,
        "webhooks": false,
        "custom_agents": false,
        "priority_queue": false,
        "team_size": 1,
        "shared_boards": false,
        "storage_mb": 10,
        "rate_limit_hour": 10
      }'::jsonb
    
    -- Solo ($19/mo)
    WHEN plan_tier = 'cloud' THEN 
      '{
        "ai_enabled": true,
        "task_limit": 100,
        "models": ["haiku", "sonnet", "kimi"],
        "api_access": false,
        "webhooks": false,
        "custom_agents": false,
        "priority_queue": false,
        "team_size": 1,
        "shared_boards": false,
        "storage_mb": 500,
        "rate_limit_hour": 200
      }'::jsonb
    
    -- Developer ($49/mo)
    WHEN plan_tier = 'cloud-developer' THEN 
      '{
        "ai_enabled": true,
        "task_limit": 400,
        "models": ["haiku", "sonnet", "opus", "kimi", "gemini", "gpt4"],
        "api_access": true,
        "webhooks": true,
        "custom_agents": true,
        "priority_queue": true,
        "team_size": 1,
        "shared_boards": false,
        "storage_mb": 2048,
        "rate_limit_hour": 500
      }'::jsonb
    
    -- Team ($99/mo)
    WHEN plan_tier = 'cloud-plus' THEN 
      '{
        "ai_enabled": true,
        "task_limit": 1000,
        "models": ["haiku", "sonnet", "opus", "kimi", "gemini", "gpt4"],
        "api_access": true,
        "webhooks": true,
        "custom_agents": true,
        "priority_queue": true,
        "team_size": 10,
        "shared_boards": true,
        "role_permissions": true,
        "storage_mb": 10240,
        "rate_limit_hour": 1000
      }'::jsonb
    
    -- Fallback (shouldn't happen)
    ELSE 
      '{
        "ai_enabled": false,
        "task_limit": null,
        "models": [],
        "team_size": 1
      }'::jsonb
  END
WHERE features = '{}'::jsonb OR features IS NULL;

-- Index for feature queries
CREATE INDEX IF NOT EXISTS idx_accounts_features ON accounts USING GIN (features);

-- Helper function to check if account has a feature
CREATE OR REPLACE FUNCTION has_feature(account_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  account_features JSONB;
BEGIN
  SELECT features INTO account_features
  FROM accounts
  WHERE id = account_uuid;
  
  IF account_features IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (account_features->feature_name)::boolean IS TRUE;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get feature value
CREATE OR REPLACE FUNCTION get_feature(account_uuid UUID, feature_name TEXT)
RETURNS TEXT AS $$
DECLARE
  account_features JSONB;
BEGIN
  SELECT features INTO account_features
  FROM accounts
  WHERE id = account_uuid;
  
  IF account_features IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN account_features->>feature_name;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if model is available for account
CREATE OR REPLACE FUNCTION can_use_model(account_uuid UUID, model_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  account_features JSONB;
  available_models JSONB;
BEGIN
  SELECT features INTO account_features
  FROM accounts
  WHERE id = account_uuid;
  
  IF account_features IS NULL THEN
    RETURN FALSE;
  END IF;
  
  available_models := account_features->'models';
  
  -- Check if model is in the array
  RETURN available_models ? model_name;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update features when plan_tier changes
CREATE OR REPLACE FUNCTION update_features_on_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update features based on new plan_tier
  NEW.features := 
    CASE 
      WHEN NEW.plan_tier = 'free' AND NEW.execution_mode = 'cloud-user-keys' THEN 
        '{"ai_enabled":true,"task_limit":null,"models":["user_provided"],"api_access":false,"webhooks":false,"team_size":1,"storage_mb":100,"rate_limit_hour":100}'::jsonb
      WHEN NEW.plan_tier = 'free' THEN 
        '{"ai_enabled":false,"task_limit":null,"models":[],"team_size":1,"storage_mb":10,"rate_limit_hour":10}'::jsonb
      WHEN NEW.plan_tier = 'cloud' THEN 
        '{"ai_enabled":true,"task_limit":100,"models":["haiku","sonnet","kimi"],"team_size":1,"storage_mb":500,"rate_limit_hour":200}'::jsonb
      WHEN NEW.plan_tier = 'cloud-developer' THEN 
        '{"ai_enabled":true,"task_limit":400,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":1,"storage_mb":2048,"rate_limit_hour":500}'::jsonb
      WHEN NEW.plan_tier = 'cloud-plus' THEN 
        '{"ai_enabled":true,"task_limit":1000,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":10,"shared_boards":true,"role_permissions":true,"storage_mb":10240,"rate_limit_hour":1000}'::jsonb
      ELSE 
        '{"ai_enabled":false,"team_size":1}'::jsonb
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_features ON accounts;
CREATE TRIGGER trigger_update_features
  BEFORE UPDATE OF plan_tier ON accounts
  FOR EACH ROW
  WHEN (OLD.plan_tier IS DISTINCT FROM NEW.plan_tier)
  EXECUTE FUNCTION update_features_on_tier_change();

-- Comments
COMMENT ON COLUMN accounts.features IS 'Feature flags as JSONB: ai_enabled, task_limit, models[], api_access, webhooks, team_size, etc.';
COMMENT ON FUNCTION has_feature IS 'Check if account has a boolean feature enabled';
COMMENT ON FUNCTION get_feature IS 'Get feature value as text';
COMMENT ON FUNCTION can_use_model IS 'Check if account can use a specific model';
