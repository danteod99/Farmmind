-- =============================================
-- FarmMind / TrustMind — Network Marketing Fase 2
-- Integracion con saldo (smm_balances)
--
-- Cuando una network_commission queda 'approved', automaticamente:
--   1. Suma el monto al smm_balances del usuario
--   2. Crea fila en smm_transactions tipo 'commission' para historial
--   3. Marca la commission como acreditada (added_to_balance = TRUE)
--
-- Ejecutar en: Supabase > SQL Editor
-- DEPENDENCIAS: supabase-network-marketing.sql, supabase-smm-schema.sql,
--               supabase-atomic-balance.sql
-- =============================================

-- ============================================================
-- 1. Agregar tipo 'commission' a smm_transactions
-- ============================================================
-- Ya tiene currency, agregamos tipo de transaccion para distinguir
-- recargas crypto vs comisiones de red.

ALTER TABLE smm_transactions
  ADD COLUMN IF NOT EXISTS tx_type TEXT DEFAULT 'crypto_topup'
    CHECK (tx_type IN ('crypto_topup','commission','manual_credit','refund','bonus'));

ALTER TABLE smm_transactions
  ADD COLUMN IF NOT EXISTS source_commission_id UUID REFERENCES network_commissions(id);

ALTER TABLE smm_transactions
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_smm_transactions_tx_type
  ON smm_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_smm_transactions_source_commission
  ON smm_transactions(source_commission_id);


-- ============================================================
-- 2. Flag en network_commissions: ya acreditada al saldo?
-- ============================================================

ALTER TABLE network_commissions
  ADD COLUMN IF NOT EXISTS added_to_balance BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_commissions_pending_credit
  ON network_commissions(user_id, added_to_balance)
  WHERE status = 'approved' AND added_to_balance = FALSE;


-- ============================================================
-- 3. RPC: acreditar comision al saldo (idempotente)
-- ============================================================
-- Llamada desde trigger o backfill manual.

CREATE OR REPLACE FUNCTION network_credit_commission_to_balance(
  p_commission_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_commission RECORD;
  v_new_balance NUMERIC;
  v_label TEXT;
BEGIN
  -- Lock + leer la comision
  SELECT * INTO v_commission
  FROM network_commissions
  WHERE id = p_commission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commission_not_found';
  END IF;

  -- Idempotencia: si ya esta acreditada, no hacer nada
  IF v_commission.added_to_balance = TRUE THEN
    RETURN 0;
  END IF;

  -- Solo aprobamos lo que esta 'approved' o 'paid'
  IF v_commission.status NOT IN ('approved','paid') THEN
    RETURN 0;
  END IF;

  -- 1. Sumar al smm_balances
  v_new_balance := increment_balance(v_commission.user_id, v_commission.amount);

  -- 2. Etiqueta legible para el historial
  v_label := CASE v_commission.type
    WHEN 'direct'           THEN 'Bono directo - red de mercadeo'
    WHEN 'binary'           THEN 'Bono binario (pata debil)'
    WHEN 'matching'         THEN 'Bono matching'
    WHEN 'pool'             THEN 'Pool de rangos'
    WHEN 'rank'             THEN 'Bono de rango'
    WHEN 'founder_override' THEN 'Override de fundador'
    ELSE 'Comision de red'
  END;

  -- 3. Crear smm_transaction tipo 'commission' (historial visible)
  INSERT INTO smm_transactions (
    user_id, amount, currency, status, credited, tx_type,
    source_commission_id, description
  )
  VALUES (
    v_commission.user_id,
    v_commission.amount,
    'USD',
    'finished',
    TRUE,
    'commission',
    v_commission.id,
    v_label
  );

  -- 4. Marcar comision como acreditada
  UPDATE network_commissions
  SET added_to_balance = TRUE,
      status = 'paid',
      paid_at = NOW()
  WHERE id = p_commission_id;

  RETURN v_commission.amount;
END;
$$;


-- ============================================================
-- 4. TRIGGER: cuando una comision pasa a 'approved', acreditar
-- ============================================================

CREATE OR REPLACE FUNCTION network_auto_credit_on_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo si paso a 'approved' Y aun no se acredito
  IF NEW.status = 'approved' AND COALESCE(NEW.added_to_balance, FALSE) = FALSE THEN
    PERFORM network_credit_commission_to_balance(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_network_auto_credit ON network_commissions;
CREATE TRIGGER trg_network_auto_credit
  AFTER INSERT OR UPDATE OF status ON network_commissions
  FOR EACH ROW
  EXECUTE FUNCTION network_auto_credit_on_approve();


-- ============================================================
-- 5. ACTUALIZAR network_grant_direct_bonus para auto-aprobar
-- ============================================================
-- Antes insertaba como 'approved' directo. Mantenemos esto para
-- que el trigger lo acredite al saldo automaticamente.

CREATE OR REPLACE FUNCTION network_grant_direct_bonus(
  p_payer_id      UUID,
  p_payment_amount NUMERIC,
  p_invoice_id    TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sponsor_id UUID;
  v_sponsor_active BOOLEAN;
  v_bonus NUMERIC;
  v_period TEXT;
BEGIN
  SELECT sponsor_id INTO v_sponsor_id
  FROM network_positions
  WHERE user_id = p_payer_id;

  IF v_sponsor_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT (subscription_status = 'active' OR subscription_plan = 'pro')
    OR EXISTS (SELECT 1 FROM network_positions WHERE user_id = v_sponsor_id AND is_founder = TRUE)
  INTO v_sponsor_active
  FROM profiles
  WHERE id = v_sponsor_id;

  IF NOT COALESCE(v_sponsor_active, FALSE) THEN
    INSERT INTO network_commissions (user_id, type, amount, source_user_id, source_payment, status, notes)
    VALUES (v_sponsor_id, 'direct', p_payment_amount * 0.15, p_payer_id, p_invoice_id,
            'reversed', 'Sponsor inactivo - regla pago para cobrar');
    RETURN 0;
  END IF;

  v_bonus  := round(p_payment_amount * 0.15, 2);
  v_period := to_char(NOW(), 'YYYY-MM');

  -- Insert como 'approved' -> el trigger network_auto_credit_on_approve
  -- llamara a network_credit_commission_to_balance() que:
  --   1. Suma al smm_balances
  --   2. Crea smm_transaction tipo commission
  --   3. Marca la comision como paid + added_to_balance
  INSERT INTO network_commissions (
    user_id, type, amount, source_user_id, source_payment, status, period
  )
  VALUES (
    v_sponsor_id, 'direct', v_bonus, p_payer_id, p_invoice_id, 'approved', v_period
  );

  RETURN v_bonus;
END;
$$;


-- ============================================================
-- 6. BACKFILL: comisiones aprobadas anteriores que aun no se acreditaron
-- ============================================================
-- Idempotente: solo procesa las que tienen added_to_balance=FALSE.
-- Ejecutar 1 vez si ya tienes data previa con comisiones approved.

DO $$
DECLARE
  v_commission_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_commission_id IN
    SELECT id FROM network_commissions
    WHERE status = 'approved'
      AND COALESCE(added_to_balance, FALSE) = FALSE
    ORDER BY created_at ASC
  LOOP
    PERFORM network_credit_commission_to_balance(v_commission_id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfill completado: % comisiones acreditadas al saldo', v_count;
END $$;


-- ============================================================
-- 7. VISTA: resumen del usuario (saldo + comisiones)
-- ============================================================

CREATE OR REPLACE VIEW network_user_summary AS
SELECT
  COALESCE(b.user_id, c.user_id) AS user_id,
  COALESCE(b.balance, 0)::NUMERIC(12, 2) AS available_balance,
  COALESCE(SUM(CASE WHEN c.type = 'direct'   AND c.status IN ('approved','paid') THEN c.amount END), 0)::NUMERIC(12, 2) AS earned_direct,
  COALESCE(SUM(CASE WHEN c.type = 'binary'   AND c.status IN ('approved','paid') THEN c.amount END), 0)::NUMERIC(12, 2) AS earned_binary,
  COALESCE(SUM(CASE WHEN c.type = 'matching' AND c.status IN ('approved','paid') THEN c.amount END), 0)::NUMERIC(12, 2) AS earned_matching,
  COALESCE(SUM(CASE WHEN c.type = 'pool'     AND c.status IN ('approved','paid') THEN c.amount END), 0)::NUMERIC(12, 2) AS earned_pool,
  COALESCE(SUM(CASE WHEN c.status IN ('approved','paid') THEN c.amount END), 0)::NUMERIC(12, 2) AS earned_total,
  COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount END), 0)::NUMERIC(12, 2) AS pending_total
FROM smm_balances b
FULL OUTER JOIN network_commissions c ON c.user_id = b.user_id
GROUP BY b.user_id, c.user_id, b.balance;

GRANT SELECT ON network_user_summary TO authenticated;


-- ============================================================
-- FIN. Para probar:
--
-- 1. Insertar comision de prueba:
--    INSERT INTO network_commissions (user_id, type, amount, status, period)
--    VALUES ('UUID_USER', 'direct', 30.00, 'approved', '2026-05');
--
-- 2. Verificar saldo:
--    SELECT * FROM smm_balances WHERE user_id = 'UUID_USER';
--    SELECT * FROM smm_transactions WHERE user_id = 'UUID_USER' AND tx_type='commission';
--    SELECT * FROM network_user_summary WHERE user_id = 'UUID_USER';
-- ============================================================
