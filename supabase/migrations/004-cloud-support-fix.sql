-- Safe re-run of cloud support migration
-- Only adds missing columns/tables/indexes

-- Add columns if they don't exist (PostgreSQL 9.6+)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='execution_mode') THEN
    ALTER TABLE accounts ADD COLUMN execution_mode TEXT DEFAULT 'openclaw';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='plan_tier') THEN
    ALTER TABLE accounts ADD COLUMN plan_tier TEXT DEFAULT 'free';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='gateway_url') THEN
    ALTER TABLE accounts ADD COLUMN gateway_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='gateway_token') THEN
    ALTER TABLE accounts ADD COLUMN gateway_token TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='gateway_connected') THEN
    ALTER TABLE accounts ADD COLUMN gateway_connected BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='gateway_last_ping') THEN
    ALTER TABLE accounts ADD COLUMN gateway_last_ping TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='api_keys') THEN
    ALTER TABLE accounts ADD COLUMN api_keys JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='stripe_customer_id') THEN
    ALTER TABLE accounts ADD COLUMN stripe_customer_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='accounts' AND column_name='stripe_subscription_id') THEN
    ALTER TABLE accounts ADD COLUMN stripe_subscription_id TEXT;
  END IF;
END $$;

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_accounts_plan_tier ON accounts(plan_tier);
CREATE INDEX IF NOT EXISTS idx_accounts_execution_mode ON accounts(execution_mode);
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_customer ON accounts(stripe_customer_id);

-- Model usage table
CREATE TABLE IF NOT EXISTS model_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID REFERENCES mc_tasks(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost_usd DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for model_usage
CREATE INDEX IF NOT EXISTS idx_usage_account ON model_usage(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_task ON model_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_usage_account_month ON model_usage(account_id, DATE_TRUNC('month', created_at));

-- Function to get monthly usage (CREATE OR REPLACE is safe)
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
