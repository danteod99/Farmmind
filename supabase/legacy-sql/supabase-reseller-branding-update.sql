-- =============================================
-- Trust Mind — Reseller Branding Update
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- Agregar columnas de branding al panel del reseller
ALTER TABLE smm_resellers
  ADD COLUMN IF NOT EXISTS panel_name   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_color  TEXT DEFAULT '#007ABF',
  ADD COLUMN IF NOT EXISTS description  TEXT DEFAULT '';

-- Tabla de clientes del reseller
-- Cuando alguien se registra en un child panel, se guarda aquí
CREATE TABLE IF NOT EXISTS smm_reseller_clients (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id   UUID REFERENCES smm_resellers(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  balance       NUMERIC(12, 6) DEFAULT 0 NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reseller_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reseller_clients_reseller ON smm_reseller_clients(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_clients_user     ON smm_reseller_clients(user_id);

ALTER TABLE smm_reseller_clients ENABLE ROW LEVEL SECURITY;

-- Resellers pueden ver sus propios clientes
CREATE POLICY "Resellers view own clients"
  ON smm_reseller_clients FOR SELECT
  USING (
    reseller_id IN (SELECT id FROM smm_resellers WHERE user_id = auth.uid())
  );
