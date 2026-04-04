-- Migration: Tiker Email (personal inbox address)
-- Purpose: Give each account a unique @tiker.com email address for receiving emails as tasks

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS tiker_username TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_tiker_username
  ON accounts(tiker_username)
  WHERE tiker_username IS NOT NULL;

COMMENT ON COLUMN accounts.tiker_username IS 'Slug used for the personal tiker email address: {tiker_username}@tiker.com';
