-- Smart Lists: contextual, calendar-aware lists (shopping, errands, packing, etc.)
CREATE TABLE IF NOT EXISTS smart_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom', -- shopping, errands, packing, prep, custom
  context JSONB DEFAULT '{}', -- e.g. { "trip_event_id": "...", "location": "SFO" }
  items JSONB DEFAULT '[]', -- array of { text, checked, added_at, source }
  is_active BOOLEAN DEFAULT true,
  auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_smart_lists_account ON smart_lists(account_id);
CREATE INDEX idx_smart_lists_active ON smart_lists(account_id, is_active);

-- RLS
ALTER TABLE smart_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own smart lists" ON smart_lists
  FOR ALL USING (
    account_id IN (
      SELECT id FROM accounts WHERE auth_uid = auth.uid()
    )
  );
