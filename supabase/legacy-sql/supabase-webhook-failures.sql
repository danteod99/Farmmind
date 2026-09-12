-- ════════════════════════════════════════════════════════════════════════
--  Tabla webhook_failures — dead-letter log de webhooks que fallaron
--  El handler devuelve 200 a Stripe siempre (para que no deshabilite el
--  endpoint) pero registra aquí los fallos para reconciliación manual.
--  Fecha: 2026-05-27
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS webhook_failures (
  id            BIGSERIAL PRIMARY KEY,
  provider      TEXT NOT NULL DEFAULT 'stripe',
  event_type    TEXT,
  event_id      TEXT,
  error_message TEXT,
  payload       JSONB,
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_unresolved
  ON webhook_failures (created_at DESC) WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_webhook_failures_event
  ON webhook_failures (provider, event_type);

-- RLS: solo service_role escribe; admins leen vía endpoint server-side.
ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;
-- Sin policies = anon/authenticated bloqueados. Service role bypassa.
