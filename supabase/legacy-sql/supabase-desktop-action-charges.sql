-- ════════════════════════════════════════════════════════════════════════
--  Audit table: desktop_action_charges
--  Registra cada cargo de acción desde las desktop apps (TrustInsta, TrustFace)
--  Útil para: debugging, analytics de uso, identificar abuso
--  Fecha: 2026-05-26
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS desktop_action_charges (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app         TEXT NOT NULL CHECK (app IN ('trustinsta', 'trustface')),
  action      TEXT NOT NULL,
  count       INTEGER NOT NULL CHECK (count > 0),
  cost        NUMERIC(12, 4) NOT NULL CHECK (cost >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_desktop_charges_user_date
  ON desktop_action_charges (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_desktop_charges_app_action
  ON desktop_action_charges (app, action);

-- RLS: usuarios solo ven sus propios cargos
ALTER TABLE desktop_action_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "desktop_charges_self_read" ON desktop_action_charges;
CREATE POLICY "desktop_charges_self_read" ON desktop_action_charges
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role (servidor) bypassa RLS automáticamente, no necesita policy de INSERT.
