-- =============================================
-- Fix: criterio estricto de "sponsor activo"
--
-- El default de profiles.subscription_status es 'active' aunque
-- el usuario nunca haya pagado. Esto hacia que TODOS los usuarios
-- contaran como suscritos (no veian paywall, cobraban comisiones
-- aunque no fueran clientes pagantes).
--
-- Ahora usamos un criterio mas estricto:
--   - subscription_plan = 'pro'
--   - stripe_subscription_id IS NOT NULL
--   - subscription_status IN ('active','trialing')
-- =============================================

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

  -- Sponsor activo si:
  --   (a) es founder (siempre cobra), o
  --   (b) tiene plan='pro' + stripe_subscription_id + status valido
  SELECT
    EXISTS (SELECT 1 FROM network_positions WHERE user_id = v_sponsor_id AND is_founder = TRUE)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = v_sponsor_id
        AND subscription_plan = 'pro'
        AND stripe_subscription_id IS NOT NULL
        AND subscription_status IN ('active','trialing')
    )
  INTO v_sponsor_active;

  IF NOT v_sponsor_active THEN
    INSERT INTO network_commissions (user_id, type, amount, source_user_id, source_payment, status, notes)
    VALUES (v_sponsor_id, 'direct', p_payment_amount * 0.15, p_payer_id, p_invoice_id,
            'reversed', 'Sponsor inactivo - regla pago para cobrar');
    RETURN 0;
  END IF;

  v_bonus  := round(p_payment_amount * 0.15, 2);
  v_period := to_char(NOW(), 'YYYY-MM');

  INSERT INTO network_commissions (user_id, type, amount, source_user_id, source_payment, status, period)
  VALUES (v_sponsor_id, 'direct', v_bonus, p_payer_id, p_invoice_id, 'approved', v_period);

  RETURN v_bonus;
END;
$$;
