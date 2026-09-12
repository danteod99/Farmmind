-- ============================================================
-- Stripe auto-recarga mensual para panel SMM
-- Corre este script en Supabase SQL Editor (una sola vez)
-- ============================================================

-- 1. Tabla de configuración de auto-recarga por usuario
CREATE TABLE IF NOT EXISTS smm_autorecharge (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  amount_usd numeric NOT NULL CHECK (amount_usd >= 20 AND amount_usd <= 500),
  interval text NOT NULL DEFAULT 'month',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'canceled', 'past_due', 'incomplete')),
  next_charge_at timestamptz,
  last_charged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smm_autorecharge_sub_id
  ON smm_autorecharge(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_smm_autorecharge_status
  ON smm_autorecharge(status) WHERE status = 'active';

-- 2. Columnas nuevas en smm_transactions para distinguir provider
ALTER TABLE smm_transactions
  ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'nowpayments'
    CHECK (payment_provider IN ('nowpayments', 'stripe')),
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS idx_smm_transactions_stripe_invoice
  ON smm_transactions(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- 3. RLS: el usuario puede leer su propia config de auto-recarga
ALTER TABLE smm_autorecharge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_autorecharge" ON smm_autorecharge;
CREATE POLICY "users_read_own_autorecharge"
  ON smm_autorecharge FOR SELECT
  USING (auth.uid() = user_id);

-- Service role puede hacer todo (webhook usa service role key)
DROP POLICY IF EXISTS "service_role_all_autorecharge" ON smm_autorecharge;
CREATE POLICY "service_role_all_autorecharge"
  ON smm_autorecharge FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_smm_autorecharge_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_smm_autorecharge_updated_at ON smm_autorecharge;
CREATE TRIGGER trg_smm_autorecharge_updated_at
  BEFORE UPDATE ON smm_autorecharge
  FOR EACH ROW
  EXECUTE FUNCTION update_smm_autorecharge_updated_at();
