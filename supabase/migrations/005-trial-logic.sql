-- Migration: Trial Logic
-- Adds trial tracking and onboarding state

-- Add trial columns to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_tasks_used INTEGER DEFAULT 0;

-- Add onboarding columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
  -- Stores things like: preferred model, use cases selected, etc.

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_accounts_trial_ends ON accounts(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_accounts_onboarding ON accounts(onboarding_completed);

-- Comments
COMMENT ON COLUMN accounts.trial_starts_at IS 'When user started their cloud trial (for cloud-our-keys mode)';
COMMENT ON COLUMN accounts.trial_ends_at IS 'When trial expires (NULL = no trial or unlimited free tier)';
COMMENT ON COLUMN accounts.trial_tasks_used IS 'Tasks used during current trial period';
COMMENT ON COLUMN accounts.onboarding_completed IS 'Whether user finished initial onboarding flow';
COMMENT ON COLUMN accounts.onboarding_step IS 'Current step in onboarding wizard (0-5)';
COMMENT ON COLUMN accounts.onboarding_data IS 'Onboarding selections (preferred model, use cases, etc.)';

-- Function to check if user is in active trial
CREATE OR REPLACE FUNCTION is_trial_active(account_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  account_record RECORD;
BEGIN
  SELECT trial_ends_at, execution_mode
  INTO account_record
  FROM accounts
  WHERE id = account_uuid;

  -- No trial for self-hosted or BYOK (always free)
  IF account_record.execution_mode IN ('openclaw', 'cloud-user-keys') THEN
    RETURN FALSE;
  END IF;

  -- For cloud-our-keys, check if trial is active
  IF account_record.trial_ends_at IS NULL THEN
    RETURN FALSE; -- No trial set
  END IF;

  RETURN account_record.trial_ends_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to start trial (called on signup for cloud-our-keys mode)
CREATE OR REPLACE FUNCTION start_trial(account_uuid UUID, duration_days INTEGER DEFAULT 7)
RETURNS VOID AS $$
BEGIN
  UPDATE accounts
  SET 
    trial_starts_at = NOW(),
    trial_ends_at = NOW() + (duration_days || ' days')::INTERVAL,
    trial_tasks_used = 0,
    updated_at = NOW()
  WHERE id = account_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to increment trial task count
CREATE OR REPLACE FUNCTION increment_trial_tasks(account_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE accounts
  SET 
    trial_tasks_used = trial_tasks_used + 1,
    updated_at = NOW()
  WHERE id = account_uuid;
END;
$$ LANGUAGE plpgsql;
