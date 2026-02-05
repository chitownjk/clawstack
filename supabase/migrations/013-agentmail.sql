-- Migration: AgentMail Integration
-- Purpose: Store AgentMail API keys for email agent functionality

-- Add agentmail_credentials column to accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS agentmail_credentials JSONB;

-- Structure: {
--   api_key: string (encrypted),
--   inboxes: array of inbox objects,
--   connected_at: number (unix timestamp)
-- }

CREATE INDEX IF NOT EXISTS idx_accounts_agentmail ON accounts USING GIN(agentmail_credentials);

-- Function to check if AgentMail is connected
CREATE OR REPLACE FUNCTION has_agentmail_connected(account_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  creds JSONB;
BEGIN
  SELECT agentmail_credentials INTO creds
  FROM accounts
  WHERE id = account_uuid;
  
  RETURN creds IS NOT NULL AND creds->>'api_key' IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON COLUMN accounts.agentmail_credentials IS 'AgentMail API credentials for email agent functionality';
COMMENT ON FUNCTION has_agentmail_connected IS 'Check if account has AgentMail connected';
