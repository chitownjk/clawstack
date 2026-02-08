-- Service Purchases table for tracking service and upsell purchases
-- Run this migration in Supabase SQL editor

-- Create service_purchases table
CREATE TABLE IF NOT EXISTS service_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL, -- 'setup', 'consulting', 'vps', 'hardware'
  amount_cents INTEGER NOT NULL,
  
  -- Stripe references
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT, -- For recurring services like VPS
  
  -- Status tracking
  payment_status TEXT NOT NULL DEFAULT 'pending', 
    -- 'pending', 'paid', 'failed', 'refunded', 'quote_requested'
  fulfillment_status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'in_progress', 'completed', 'canceled'
  fulfillment_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_purchases_account_id ON service_purchases(account_id);
CREATE INDEX IF NOT EXISTS idx_service_purchases_service_type ON service_purchases(service_type);
CREATE INDEX IF NOT EXISTS idx_service_purchases_payment_status ON service_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_service_purchases_fulfillment_status ON service_purchases(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_service_purchases_created_at ON service_purchases(created_at DESC);

-- RLS Policies
ALTER TABLE service_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON service_purchases FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE auth_uid = auth.uid()
    )
  );

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
  ON service_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE auth_uid = auth.uid() 
      AND role = 'mc_admin'
    )
  );

-- Admins can update purchases
CREATE POLICY "Admins can update purchases"
  ON service_purchases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE auth_uid = auth.uid() 
      AND role = 'mc_admin'
    )
  );

-- Service can insert purchases (for checkout route)
CREATE POLICY "Service can insert purchases"
  ON service_purchases FOR INSERT
  WITH CHECK (true); -- Controlled by API route auth

-- Grant access to authenticated users
GRANT SELECT ON service_purchases TO authenticated;
GRANT INSERT ON service_purchases TO authenticated;
GRANT UPDATE ON service_purchases TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_service_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_purchases_updated_at
  BEFORE UPDATE ON service_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_service_purchases_updated_at();
