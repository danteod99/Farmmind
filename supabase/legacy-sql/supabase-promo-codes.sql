-- =====================================================
-- PROMO CODES — TRUST MIND Launch Campaign
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code         TEXT UNIQUE NOT NULL,
  bonus_usd    NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_recharge NUMERIC(10,2) NOT NULL DEFAULT 20,
  max_uses     INTEGER NOT NULL DEFAULT 100,
  current_uses INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. Add promo columns to smm_transactions
ALTER TABLE smm_transactions
  ADD COLUMN IF NOT EXISTS promo_code    TEXT,
  ADD COLUMN IF NOT EXISTS promo_applied BOOLEAN DEFAULT false;

-- 3. RLS: only admins (service role) can read/write promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by Next.js API routes)
CREATE POLICY "service_role_all" ON promo_codes
  FOR ALL USING (true);

-- 4. Example: insert your first launch promo code
-- Change "LAUNCH25" and the bonus/min amounts as you like
INSERT INTO promo_codes (code, bonus_usd, min_recharge, max_uses, active)
VALUES ('LAUNCH25', 5.00, 20.00, 200, true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- Done! You can manage codes in the Supabase dashboard
-- or via the admin panel (coming soon).
-- =====================================================
