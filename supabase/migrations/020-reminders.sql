-- Migration 020: Smart Reminders with Escalation
-- Adds a reminders table for tracking reminder state and escalation.

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id UUID REFERENCES mc_tasks(id) ON DELETE CASCADE,
  extracted_item_id UUID REFERENCES extracted_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'task',  -- task, bill, event, custom
  due_at TIMESTAMPTZ,

  -- Escalation tracking
  escalation_level INTEGER DEFAULT 0,   -- 0=initial, 1=+1d, 2=+3d, 3=+7d
  last_reminded_at TIMESTAMPTZ,
  next_remind_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,

  -- State
  status TEXT NOT NULL DEFAULT 'active', -- active, snoozed, completed, dismissed
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Delivery
  deliver_push BOOLEAN DEFAULT TRUE,
  deliver_email BOOLEAN DEFAULT FALSE,
  deliver_briefing BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reminders"
  ON reminders FOR SELECT
  USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_account ON reminders(account_id);
CREATE INDEX IF NOT EXISTS idx_reminders_next_remind ON reminders(next_remind_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(account_id, status);
