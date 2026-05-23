-- =============================================
-- CEO default sponsor: si un usuario paga sin tener sponsor,
-- el bono directo va al founder que está al top del árbol (CEO).
--
-- Adicionalmente: helper para obtener el CEO_USER_ID dinámicamente.
-- =============================================

-- Helper: devuelve el UUID del CEO (founder al top, sin sponsor)
CREATE OR REPLACE FUNCTION network_get_ceo()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ceo UUID;
BEGIN
  SELECT user_id INTO v_ceo
  FROM network_positions
  WHERE is_founder = TRUE
    AND sponsor_id IS NULL
    AND placement_parent_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  RETURN v_ceo;
END;
$$;

-- Recreate network_grant_direct_bonus con fallback al CEO
DROP FUNCTION IF EXISTS network_grant_direct_bonus(UUID, NUMERIC, TEXT);

CREATE FUNCTION network_grant_direct_bonus(
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
  v_ceo_id     UUID;
  v_bonus      NUMERIC;
  v_period     TEXT;
  v_notes      TEXT := '';
BEGIN
  -- 1. Buscar sponsor del payer (si entró con link)
  SELECT sponsor_id INTO v_sponsor_id
  FROM network_positions
  WHERE user_id = p_payer_id;

  -- 2. Si no tiene posición, ver si tiene pending
  IF v_sponsor_id IS NULL THEN
    SELECT sponsor_id INTO v_sponsor_id
    FROM network_pending_placements
    WHERE user_id = p_payer_id
    LIMIT 1;
  END IF;

  -- 3. FALLBACK: si no tiene sponsor, asignar al CEO
  IF v_sponsor_id IS NULL THEN
    v_ceo_id := network_get_ceo();
    IF v_ceo_id IS NULL THEN
      RETURN 0;  -- no hay CEO definido, no se puede asignar
    END IF;
    v_sponsor_id := v_ceo_id;
    v_notes := 'Bono asignado al CEO (default - usuario sin sponsor)';

    -- También crear pending placement bajo CEO para que pueda colocarlo
    IF NOT EXISTS (
      SELECT 1 FROM network_pending_placements WHERE user_id = p_payer_id
    ) AND NOT EXISTS (
      SELECT 1 FROM network_positions WHERE user_id = p_payer_id
    ) THEN
      INSERT INTO network_pending_placements (user_id, sponsor_id, status)
      VALUES (p_payer_id, v_ceo_id, 'pending');
    END IF;
  END IF;

  -- 4. Verificar que sponsor sea activo (founder o suscrito)
  IF NOT (
    EXISTS (SELECT 1 FROM network_positions WHERE user_id = v_sponsor_id AND is_founder = TRUE)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = v_sponsor_id
        AND subscription_plan = 'pro'
        AND stripe_subscription_id IS NOT NULL
        AND subscription_status IN ('active','trialing')
    )
  ) THEN
    INSERT INTO network_commissions (user_id, type, amount, source_user_id, source_payment, status, notes)
    VALUES (v_sponsor_id, 'direct', p_payment_amount * 0.15, p_payer_id, p_invoice_id,
            'reversed', 'Sponsor inactivo - regla pago para cobrar');
    RETURN 0;
  END IF;

  v_bonus  := round(p_payment_amount * 0.15, 2);
  v_period := to_char(NOW(), 'YYYY-MM');

  INSERT INTO network_commissions (user_id, type, amount, source_user_id, source_payment, status, period, notes)
  VALUES (v_sponsor_id, 'direct', v_bonus, p_payer_id, p_invoice_id, 'approved', v_period, v_notes);

  RETURN v_bonus;
END;
$$;
