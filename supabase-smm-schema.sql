-- =============================================
-- FarmMind SMM Panel - Supabase Schema
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- Tabla: smm_balances (balance de cada usuario en el panel SMM)
CREATE TABLE IF NOT EXISTS smm_balances (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance     NUMERIC(12, 6) DEFAULT 0 NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: smm_orders (pedidos del panel SMM)
CREATE TABLE IF NOT EXISTS smm_orders (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jap_order_id INTEGER NOT NULL,
  service_id   INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  category     TEXT DEFAULT '',
  link         TEXT NOT NULL,
  quantity     INTEGER NOT NULL,
  rate         NUMERIC(12, 6) NOT NULL,      -- precio por 1000 unidades
  charge       NUMERIC(12, 6) NOT NULL,      -- costo total del pedido
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','inprogress','completed','partial','canceled')),
  start_count  TEXT,
  remains      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar las queries
CREATE INDEX IF NOT EXISTS idx_smm_orders_user_id   ON smm_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_smm_orders_status     ON smm_orders(status);
CREATE INDEX IF NOT EXISTS idx_smm_orders_created_at ON smm_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smm_balances_user_id  ON smm_balances(user_id);

-- ============================
-- Row Level Security (RLS)
-- ============================

ALTER TABLE smm_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE smm_orders   ENABLE ROW LEVEL SECURITY;

-- Políticas para smm_balances
CREATE POLICY "Users can view own balance"
  ON smm_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage balances"
  ON smm_balances FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para smm_orders
CREATE POLICY "Users can view own orders"
  ON smm_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders"
  ON smm_orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================
-- Trigger: updated_at automático
-- ============================

CREATE OR REPLACE FUNCTION update_smm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER smm_orders_updated_at
  BEFORE UPDATE ON smm_orders
  FOR EACH ROW EXECUTE FUNCTION update_smm_updated_at();

CREATE TRIGGER smm_balances_updated_at
  BEFORE UPDATE ON smm_balances
  FOR EACH ROW EXECUTE FUNCTION update_smm_updated_at();

-- ============================
-- Tabla: smm_transactions (historial de recargas crypto)
-- Agregar DESPUÉS de ejecutar el schema inicial
-- ============================

CREATE TABLE IF NOT EXISTS smm_transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id        TEXT,
  amount            NUMERIC(12, 4) NOT NULL,
  currency          TEXT DEFAULT 'usdttrc20',
  status            TEXT DEFAULT 'waiting',
  credited          BOOLEAN DEFAULT false,
  actually_paid     NUMERIC(18, 8),
  nowpayments_data  JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smm_transactions_user_id    ON smm_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_smm_transactions_payment_id ON smm_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_smm_transactions_status     ON smm_transactions(status);

ALTER TABLE smm_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON smm_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
  ON smm_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER smm_transactions_updated_at
  BEFORE UPDATE ON smm_transactions
  FOR EACH ROW EXECUTE FUNCTION update_smm_updated_at();
