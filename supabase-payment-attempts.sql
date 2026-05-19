-- ============================================================
-- Tabla de intentos de pago (registra abandono, rechazo y éxito)
-- Corre este script una sola vez en Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('initiated', 'abandoned', 'failed', 'succeeded')),
  amount numeric,
  currency text DEFAULT 'usd',
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  failure_code text,
  failure_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_email ON payment_attempts(email);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created ON payment_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_session
  ON payment_attempts(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- Solo service_role escribe/lee. Admin del panel usa service role.
DROP POLICY IF EXISTS "service_role_all_payment_attempts" ON payment_attempts;
CREATE POLICY "service_role_all_payment_attempts"
  ON payment_attempts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
