-- Migration: Google OAuth Integration
-- Purpose: Store Google OAuth tokens for calendar/email access

-- Add google_tokens column to accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS google_tokens JSONB;

-- Structure: {
--   access_token: string,
--   refresh_token: string,
--   expires_at: number (unix timestamp),
--   scope: string
-- }

CREATE INDEX IF NOT EXISTS idx_accounts_google_tokens ON accounts USING GIN(google_tokens);

-- Function to check if Google tokens are valid
CREATE OR REPLACE FUNCTION has_valid_google_tokens(account_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  tokens JSONB;
  expires_at BIGINT;
BEGIN
  SELECT google_tokens INTO tokens
  FROM accounts
  WHERE id = account_uuid;
  
  IF tokens IS NULL THEN
    RETURN FALSE;
  END IF;
  
  expires_at := (tokens->>'expires_at')::BIGINT;
  
  -- Token is valid if it expires more than 5 minutes from now
  RETURN expires_at > EXTRACT(EPOCH FROM NOW()) + 300;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON COLUMN accounts.google_tokens IS 'Google OAuth tokens for calendar/email access';
COMMENT ON FUNCTION has_valid_google_tokens IS 'Check if account has valid (non-expired) Google OAuth tokens';
