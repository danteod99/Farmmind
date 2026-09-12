-- ============================================================
-- ABANDONED CART RECOVERY
-- Reengancha por email a quien inició el checkout Pro y no pagó.
-- Fuente: payment_attempts.status = 'abandoned' con email capturado.
-- Un cron (/api/cron/abandoned-cart) procesa 2 emails de recuperación.
-- Corre este script una sola vez en Supabase SQL Editor.
-- ============================================================

-- Tracking de la secuencia de recuperación sobre cada intento abandonado.
ALTER TABLE payment_attempts
  ADD COLUMN IF NOT EXISTS recovery_step int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_last_sent_at timestamptz;
-- recovery_step: 0 = no enviado · 1 = email#1 enviado · 2 = email#2 enviado
--                99 = cerrado (pagó o se dio de baja)

CREATE INDEX IF NOT EXISTS idx_payment_attempts_recovery
  ON payment_attempts(created_at DESC)
  WHERE status = 'abandoned' AND email IS NOT NULL AND recovery_step < 2;

-- Lista de supresión por DIRECCIÓN de email (sirve para invitados sin cuenta,
-- que no tienen user_id y por eso no caben en email_unsubscribes).
CREATE TABLE IF NOT EXISTS email_suppressions (
  email      text PRIMARY KEY,        -- siempre en minúsculas
  reason     text,
  source     text DEFAULT 'abandoned_cart',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
-- Sin policies = solo service_role lee/escribe.
