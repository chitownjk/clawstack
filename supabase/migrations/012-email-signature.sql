-- Add email signature to accounts
-- This will be appended to all emails sent by agents

ALTER TABLE accounts
ADD COLUMN email_signature TEXT DEFAULT E'\n\n---\nSent by my Tiker assistant';

COMMENT ON COLUMN accounts.email_signature IS 'Signature appended to all agent-sent emails (user-editable)';
