-- Add recurrence support to tasks
ALTER TABLE mc_tasks
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;

COMMENT ON COLUMN mc_tasks.recurrence_rule IS 'JSON recurrence rule: {freq, days?, endDate?}. freq: daily|weekdays|weekends|weekly|monthly';
