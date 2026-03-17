-- ═══════════════════════════════════════════════════════════════════════
-- Storefront Customization Columns for smm_resellers
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- Hero section customization
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT '';
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT '';
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Comenzar ahora';
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS cta_secondary_text TEXT DEFAULT 'Ya tengo cuenta';

-- Social links & contact
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT '';
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '';
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS telegram_url TEXT DEFAULT '';
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS tiktok_url TEXT DEFAULT '';

-- Storefront toggles
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS show_features_section BOOLEAN DEFAULT true;
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS show_plans_section BOOLEAN DEFAULT true;
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS show_powered_by BOOLEAN DEFAULT true;

-- Domain verification
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false;
ALTER TABLE smm_resellers ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMPTZ;

-- Done
SELECT 'Storefront customization columns added successfully!' AS result;
