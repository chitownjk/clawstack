-- Fix existing accounts that don't have execution_mode set properly
-- Run this in Supabase SQL Editor AFTER running migration 008

-- Set execution_mode for accounts that don't have it set
-- Default cloud users to 'cloud-our-keys' (paid tier)
UPDATE accounts
SET execution_mode = 'cloud-our-keys'
WHERE execution_mode IS NULL;

-- If you want to set specific accounts to different modes:

-- Set specific account to BYOK (replace email with actual email)
-- UPDATE accounts
-- SET execution_mode = 'cloud-user-keys'
-- WHERE email = 'your-email@example.com';

-- Set specific account to self-hosted
-- UPDATE accounts
-- SET execution_mode = 'openclaw'
-- WHERE email = 'self-hosted-user@example.com';

-- Verify the changes
SELECT id, email, plan_tier, execution_mode, stripe_customer_id
FROM accounts
ORDER BY created_at DESC
LIMIT 10;
