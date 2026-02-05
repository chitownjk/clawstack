-- Debug script for Jay's testcloud account issues
-- Run this in Supabase SQL Editor

-- 1. Check Jay's account (should be jayjk60614@gmail.com on testcloud)
SELECT 
  id as account_id,
  auth_uid,
  plan_tier,
  execution_mode,
  two_factor_enabled,
  created_at
FROM accounts
WHERE auth_uid IN (
  SELECT id FROM auth.users WHERE email LIKE '%jay%'
)
ORDER BY created_at DESC;

-- 2. Check tasks for Jay's account
SELECT 
  t.id,
  t.title,
  t.status,
  t.assigned_agent_ids,
  t.account_id,
  t.created_at
FROM mc_tasks t
WHERE t.account_id IN (
  SELECT id FROM accounts WHERE auth_uid IN (
    SELECT id FROM auth.users WHERE email LIKE '%jay%'
  )
)
ORDER BY t.created_at DESC;

-- 3. Check agents for Jay's account
SELECT 
  aat.id,
  aat.name,
  aat.emoji,
  aat.model_tier,
  aat.account_id,
  aat.created_at
FROM account_agent_templates aat
WHERE aat.account_id IN (
  SELECT id FROM accounts WHERE auth_uid IN (
    SELECT id FROM auth.users WHERE email LIKE '%jay%'
  )
)
ORDER BY aat.created_at DESC;

-- 4. Check RLS policies are enabled
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('mc_tasks', 'mc_comments', 'account_agent_templates')
ORDER BY tablename, policyname;

-- 5. Test RLS from user perspective (run as authenticated user)
-- This simulates what the UI sees
-- SET LOCAL role = 'authenticated';
-- SET LOCAL request.jwt.claims = '{"sub": "<auth_uid_here>"}';
-- SELECT * FROM mc_tasks LIMIT 5;
-- SELECT * FROM account_agent_templates LIMIT 5;
-- RESET role;
