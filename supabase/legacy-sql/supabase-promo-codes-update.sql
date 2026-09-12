-- =====================================================
-- PROMO CODES UPDATE — Add reseller support
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add reseller_id so resellers can own their own codes
-- NULL = main platform code (created by admin)
-- UUID = code created by a specific reseller
ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES smm_resellers(id) ON DELETE CASCADE;

-- Index for fast lookups by reseller
CREATE INDEX IF NOT EXISTS idx_promo_codes_reseller ON promo_codes(reseller_id);
