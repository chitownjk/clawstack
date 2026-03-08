-- ============================================
-- Add role column to accounts for admin access
-- ============================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role);
