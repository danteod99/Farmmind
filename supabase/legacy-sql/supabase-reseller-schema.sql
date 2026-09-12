-- =============================================
-- Trust Mind — Reseller / Child Panel Schema
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- Tabla: smm_resellers
-- Cada reseller es un usuario de auth.users con una cuenta revendedor
CREATE TABLE IF NOT EXISTS smm_resellers (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  api_key        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  company_name   TEXT DEFAULT '',
  custom_domain  TEXT DEFAULT '',        -- dominio del child panel (opcional)
  balance        NUMERIC(12, 6) DEFAULT 0 NOT NULL,
  is_active      BOOLEAN DEFAULT true,
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: smm_reseller_prices
-- Precios personalizados que el reseller cobra a sus clientes (> precio de costo)
CREATE TABLE IF NOT EXISTS smm_reseller_prices (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id   UUID REFERENCES smm_resellers(id) ON DELETE CASCADE NOT NULL,
  service_id    INTEGER NOT NULL,
  service_name  TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  rate          NUMERIC(12, 6) NOT NULL,   -- precio por 1000 que cobra el reseller
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reseller_id, service_id)
);

-- Columna extra en smm_orders para rastrear pedidos de resellers
ALTER TABLE smm_orders
  ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES smm_resellers(id),
  ADD COLUMN IF NOT EXISTS reseller_rate NUMERIC(12, 6); -- precio que cobró el reseller

-- Índices
CREATE INDEX IF NOT EXISTS idx_smm_resellers_user_id    ON smm_resellers(user_id);
CREATE INDEX IF NOT EXISTS idx_smm_resellers_api_key    ON smm_resellers(api_key);
CREATE INDEX IF NOT EXISTS idx_smm_resellers_domain     ON smm_resellers(custom_domain);
CREATE INDEX IF NOT EXISTS idx_smm_reseller_prices_res  ON smm_reseller_prices(reseller_id);
CREATE INDEX IF NOT EXISTS idx_smm_orders_reseller_id   ON smm_orders(reseller_id);

-- ============================
-- Row Level Security
-- ============================

ALTER TABLE smm_resellers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE smm_reseller_prices ENABLE ROW LEVEL SECURITY;

-- Resellers pueden ver solo su propia cuenta
CREATE POLICY "Resellers can view own account"
  ON smm_resellers FOR SELECT
  USING (auth.uid() = user_id);

-- Solo service role puede modificar cuentas de reseller
CREATE POLICY "Service role can manage resellers"
  ON smm_resellers FOR ALL
  USING (true) WITH CHECK (true);

-- Resellers pueden ver sus propios precios
CREATE POLICY "Resellers can view own prices"
  ON smm_reseller_prices FOR SELECT
  USING (
    reseller_id IN (
      SELECT id FROM smm_resellers WHERE user_id = auth.uid()
    )
  );

-- Solo service role puede modificar precios
CREATE POLICY "Service role can manage reseller prices"
  ON smm_reseller_prices FOR ALL
  USING (true) WITH CHECK (true);

-- ============================
-- Trigger: updated_at
-- ============================

CREATE TRIGGER smm_resellers_updated_at
  BEFORE UPDATE ON smm_resellers
  FOR EACH ROW EXECUTE FUNCTION update_smm_updated_at();

CREATE TRIGGER smm_reseller_prices_updated_at
  BEFORE UPDATE ON smm_reseller_prices
  FOR EACH ROW EXECUTE FUNCTION update_smm_updated_at();

-- ============================
-- Función: decrement_reseller_balance
-- Usada por /api/v2 al crear pedidos
-- ============================

CREATE OR REPLACE FUNCTION decrement_reseller_balance(
  p_reseller_id UUID,
  p_amount      NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE smm_resellers
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = p_reseller_id;
END;
$$;
