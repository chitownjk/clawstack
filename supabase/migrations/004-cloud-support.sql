-- Migration: Cloud Support
-- Adds fields needed for cloud-hosted Tiker

-- Add cloud-related columns to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'openclaw';
  -- 'openclaw' = user has their own gateway
  -- 'cloud-user-keys' = cloud execution with user's API keys ($7/mo)
  -- 'cloud-our-keys' = cloud execution with our keys ($19-29/mo)

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free';
  -- 'free' = OSS self-hosted
  -- 'cloud' = $7/mo (your keys)
  -- 'cloud-plus' = $19-29/mo (our keys)

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_token TEXT; -- Encrypted
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_last_ping TIMESTAMP;

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_keys JSONB;
  -- Encrypted API keys for cloud execution modes
  -- { "anthropic": "...", "openai": "...", "google": "..." }

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_accounts_plan_tier ON accounts(plan_tier);
CREATE INDEX IF NOT EXISTS idx_accounts_execution_mode ON accounts(execution_mode);
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_customer ON accounts(stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN accounts.plan_tier IS 'Subscription tier: free, pro, team, team_plus';
COMMENT ON COLUMN accounts.execution_mode IS 'Execution mode: openclaw, cloud-user-keys, cloud-our-keys';
COMMENT ON COLUMN accounts.gateway_url IS 'User OpenClaw gateway URL (for cloud-connected mode)';
COMMENT ON COLUMN accounts.gateway_token IS 'Encrypted API token for gateway';
COMMENT ON COLUMN accounts.gateway_connected IS 'Whether gateway is currently reachable';
COMMENT ON COLUMN accounts.gateway_last_ping IS 'Last successful gateway health check';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Model usage tracking for cloud-our-keys mode
CREATE TABLE IF NOT EXISTS model_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID REFERENCES mc_tasks(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'anthropic', 'openai', 'google'
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost_usd DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_account ON model_usage(account_id, created_at DESC);
CREATE INDEX idx_usage_task ON model_usage(task_id);
CREATE INDEX idx_usage_account_month ON model_usage(account_id, DATE_TRUNC('month', created_at));

COMMENT ON TABLE model_usage IS 'Track model token usage for billing (cloud-our-keys mode)';

-- Function to get monthly usage
CREATE OR REPLACE FUNCTION get_monthly_usage(account_uuid UUID, month_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_tasks BIGINT,
  total_tokens BIGINT,
  total_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT task_id)::BIGINT,
    (SUM(tokens_in) + SUM(tokens_out))::BIGINT,
    SUM(cost_usd)::DECIMAL
  FROM model_usage
  WHERE account_id = account_uuid
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', month_date);
END;
$$ LANGUAGE plpgsql;
