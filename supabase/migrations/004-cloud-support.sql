-- Migration: Cloud Support
-- Adds fields needed for cloud-hosted Tiker

-- Add cloud-related columns to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS product_mode TEXT DEFAULT 'oss';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_token TEXT; -- Will be encrypted
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_last_ping TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_accounts_plan_tier ON accounts(plan_tier);
CREATE INDEX IF NOT EXISTS idx_accounts_product_mode ON accounts(product_mode);
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_customer ON accounts(stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN accounts.plan_tier IS 'Subscription tier: free, pro, team, team_plus';
COMMENT ON COLUMN accounts.product_mode IS 'Deployment mode: oss, cloud';
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

-- Future: model_usage table for billing (Phase 3)
-- Commented out for now, will add when we build cloud-hosted agents
/*
CREATE TABLE IF NOT EXISTS model_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID REFERENCES mc_tasks(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost_usd DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_account ON model_usage(account_id, created_at DESC);
CREATE INDEX idx_usage_task ON model_usage(task_id);

COMMENT ON TABLE model_usage IS 'Track model token usage for billing (cloud-hosted mode)';
*/
