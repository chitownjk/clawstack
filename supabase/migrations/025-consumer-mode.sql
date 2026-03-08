-- Consumer mode: simple vs advanced UI toggle
-- All accounts default to consumer mode (is_advanced_mode = false)

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_advanced_mode boolean DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS use_case text; -- 'household', 'business', 'both'
