-- =============================================
-- Trust Mind — Child Panel Storefront Schema
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- ============================
-- 1. Agregar slug a smm_resellers
-- ============================

ALTER TABLE smm_resellers
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generar slugs automáticos para resellers existentes basados en panel_name o company_name
-- (Ejecutar manualmente después si es necesario)

CREATE INDEX IF NOT EXISTS idx_smm_resellers_slug ON smm_resellers(slug);

-- ============================
-- 2. Actualizar smm_reseller_clients
-- ============================

ALTER TABLE smm_reseller_clients
  ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS last_login  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS email       TEXT DEFAULT '';

-- ============================
-- 3. Tabla: smm_reseller_plans
-- Planes de suscripción creados por resellers
-- ============================

CREATE TABLE IF NOT EXISTS smm_reseller_plans (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id        UUID REFERENCES smm_resellers(id) ON DELETE CASCADE NOT NULL,
  plan_name          TEXT NOT NULL DEFAULT '',
  description        TEXT DEFAULT '',
  price_usd          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  services_included  JSONB DEFAULT '[]'::jsonb,
  -- formato: [{"service_id": 123, "service_name": "Instagram Followers", "quantity": 5000}, ...]
  period_days        INTEGER DEFAULT 30,
  active             BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reseller_plans_reseller ON smm_reseller_plans(reseller_id);

-- ============================
-- 4. Tabla: smm_reseller_subscriptions
-- Suscripciones activas de clientes del child panel
-- ============================

CREATE TABLE IF NOT EXISTS smm_reseller_subscriptions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id           UUID REFERENCES smm_resellers(id) ON DELETE CASCADE NOT NULL,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id               UUID REFERENCES smm_reseller_plans(id) ON DELETE SET NULL,
  status                TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'past_due')),
  current_period_start  TIMESTAMPTZ DEFAULT NOW(),
  current_period_end    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  auto_renew            BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reseller_id, user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_reseller_subs_reseller ON smm_reseller_subscriptions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_subs_user     ON smm_reseller_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reseller_subs_status   ON smm_reseller_subscriptions(status);

-- ============================
-- 5. Agregar reseller_id a smm_transactions
-- Para rastrear pagos hechos por clientes de child panels
-- ============================

ALTER TABLE smm_transactions
  ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES smm_resellers(id);

CREATE INDEX IF NOT EXISTS idx_smm_transactions_reseller ON smm_transactions(reseller_id);

-- ============================
-- 6. Row Level Security
-- ============================

ALTER TABLE smm_reseller_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE smm_reseller_subscriptions ENABLE ROW LEVEL SECURITY;

-- Planes: lectura pública (clientes ven planes), escritura solo reseller
CREATE POLICY "Anyone can view active plans"
  ON smm_reseller_plans FOR SELECT
  USING (active = true);

CREATE POLICY "Resellers can manage own plans"
  ON smm_reseller_plans FOR ALL
  USING (
    reseller_id IN (SELECT id FROM smm_resellers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    reseller_id IN (SELECT id FROM smm_resellers WHERE user_id = auth.uid())
  );

-- Service role can manage all plans
CREATE POLICY "Service role manages all plans"
  ON smm_reseller_plans FOR ALL
  USING (true) WITH CHECK (true);

-- Suscripciones: usuarios ven las suyas, resellers ven las de sus clientes
CREATE POLICY "Users can view own subscriptions"
  ON smm_reseller_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Resellers can view client subscriptions"
  ON smm_reseller_subscriptions FOR SELECT
  USING (
    reseller_id IN (SELECT id FROM smm_resellers WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role manages all subscriptions"
  ON smm_reseller_subscriptions FOR ALL
  USING (true) WITH CHECK (true);

-- ============================
-- 7. Triggers: updated_at
-- ============================

CREATE TRIGGER smm_reseller_plans_updated_at
  BEFORE UPDATE ON smm_reseller_plans
  FOR EACH ROW EXECUTE FUNCTION update_smm_updated_at();

CREATE TRIGGER smm_reseller_subscriptions_updated_at
  BEFORE UPDATE ON smm_reseller_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_smm_updated_at();

-- ============================
-- 8. Función helper: resolve reseller by slug or domain
-- ============================

CREATE OR REPLACE FUNCTION get_reseller_by_slug_or_domain(
  p_slug TEXT DEFAULT NULL,
  p_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  slug TEXT,
  panel_name TEXT,
  logo_url TEXT,
  brand_color TEXT,
  description TEXT,
  custom_domain TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id, r.user_id, r.slug, r.panel_name, r.logo_url,
    r.brand_color, r.description, r.custom_domain, r.is_active
  FROM smm_resellers r
  WHERE r.is_active = true
    AND (
      (p_slug IS NOT NULL AND r.slug = p_slug)
      OR (p_domain IS NOT NULL AND r.custom_domain = p_domain)
    )
  LIMIT 1;
END;
$$;
