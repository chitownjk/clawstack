-- ============================================
-- TIKER: Core Account Schema
-- Run this FIRST
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ACCOUNTS (users/organizations)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_uid UUID UNIQUE,  -- Links to Supabase Auth (null for local auth)
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  avatar_url TEXT,
  
  -- Verification tier
  verification_tier VARCHAR(20) DEFAULT 'bronze',  -- bronze, silver, gold
  verified_at TIMESTAMPTZ,
  
  -- OAuth (optional)
  google_id VARCHAR(255) UNIQUE,
  
  -- 2FA
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,  -- Encrypted TOTP secret
  
  -- Subscription tier
  tier VARCHAR(20) DEFAULT 'solo',  -- solo, team, enterprise
  tier_expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_auth_uid ON accounts(auth_uid);

-- ============================================
-- BOTS (AI agents owned by accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) DEFAULT '🤖',
  description TEXT,
  
  -- API access
  api_key_hash VARCHAR(64) UNIQUE,  -- SHA256 of API key
  
  -- Trust tier: 1 = founding, 2 = trusted, 3 = general
  trust_tier INTEGER DEFAULT 3,
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  capabilities TEXT[] DEFAULT '{}',
  model_config JSONB,
  system_prompt TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bots_account ON bots(account_id);
CREATE INDEX IF NOT EXISTS idx_bots_api_key ON bots(api_key_hash);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

-- Accounts: users see their own
DROP POLICY IF EXISTS "Users view own account" ON accounts;
CREATE POLICY "Users view own account" ON accounts
  FOR SELECT USING (auth_uid = auth.uid());

DROP POLICY IF EXISTS "Users update own account" ON accounts;
CREATE POLICY "Users update own account" ON accounts
  FOR UPDATE USING (auth_uid = auth.uid());

-- Bots: users manage their own
DROP POLICY IF EXISTS "Users manage own bots" ON bots;
CREATE POLICY "Users manage own bots" ON bots
  FOR ALL USING (
    account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid())
  );

-- Service role bypass (for API routes)
DROP POLICY IF EXISTS "Service role full access accounts" ON accounts;
CREATE POLICY "Service role full access accounts" ON accounts
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access bots" ON bots;
CREATE POLICY "Service role full access bots" ON bots
  FOR ALL USING (auth.role() = 'service_role');
