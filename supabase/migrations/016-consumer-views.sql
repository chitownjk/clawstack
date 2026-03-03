-- ============================================
-- 016: Consumer-Friendly Views
-- Add fields to support multiple view types
-- ============================================

-- Add consumer-friendly fields to tasks
ALTER TABLE mc_tasks 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_human TEXT,
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_block BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Create index for due_date queries (time-based view)
CREATE INDEX IF NOT EXISTS idx_mc_tasks_due_date 
ON mc_tasks(due_date) 
WHERE due_date IS NOT NULL;

-- Create index for position (list view manual ordering)
CREATE INDEX IF NOT EXISTS idx_mc_tasks_position 
ON mc_tasks(account_id, position);

-- Create index for assigned_human (calendar view)
CREATE INDEX IF NOT EXISTS idx_mc_tasks_assigned_human 
ON mc_tasks(assigned_human) 
WHERE assigned_human IS NOT NULL;

-- Add user preferences for default view
CREATE TABLE IF NOT EXISTS mc_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE UNIQUE,
  default_view TEXT DEFAULT 'list',  -- list, kanban, time, calendar
  view_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_prefs_account 
ON mc_user_preferences(account_id);

-- Row Level Security for user preferences
ALTER TABLE mc_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own preferences" ON mc_user_preferences;
CREATE POLICY "Users manage own preferences" ON mc_user_preferences
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Service role preferences" ON mc_user_preferences;
CREATE POLICY "Service role preferences" ON mc_user_preferences 
  FOR ALL USING (auth.role() = 'service_role');

-- Add comment to explain priority values
COMMENT ON COLUMN mc_tasks.priority IS 'Priority level: now (urgent/today), soon (this week), later (>7 days or no date)';

-- Add comment to explain time_block
COMMENT ON COLUMN mc_tasks.time_block IS 'If true, creates a calendar block/event for dedicated work time';
