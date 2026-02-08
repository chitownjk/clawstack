-- Migration: GitHub OAuth Integration
-- Purpose: Store GitHub OAuth tokens for repository access

-- Add github_tokens column to accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS github_tokens JSONB;

-- Structure: {
--   access_token: string,
--   scope: string,
--   token_type: string,
--   github_user: { login, id, avatar_url },
--   connected_at: number (unix timestamp)
-- }

CREATE INDEX IF NOT EXISTS idx_accounts_github ON accounts USING GIN(github_tokens);

-- Function to check if GitHub is connected
CREATE OR REPLACE FUNCTION has_github_connected(account_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  tokens JSONB;
BEGIN
  SELECT github_tokens INTO tokens
  FROM accounts
  WHERE id = account_uuid;
  
  RETURN tokens IS NOT NULL AND tokens->>'access_token' IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON COLUMN accounts.github_tokens IS 'GitHub OAuth tokens for repository and issue access';
COMMENT ON FUNCTION has_github_connected IS 'Check if account has GitHub OAuth connected';
