-- =============================================
-- Fix: el RPC de colocacion ahora exige que el usuario haya pagado
--
-- Antes: cualquier pending_placement se podia colocar en izq/der
--        sin importar si el usuario habia pagado la suscripcion.
-- Ahora: solo se puede colocar a usuarios que:
--        - sean founders (Dante, Flavio, Estefany, Pedro), o
--        - tengan subscription_plan='pro' + stripe_subscription_id
--          + status IN ('active','trialing')
--
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

CREATE OR REPLACE FUNCTION network_place_user(
  p_sponsor_id UUID,
  p_user_id    UUID,
  p_leg        TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $body$
DECLARE
  v_pending  RECORD;
  v_parent_id UUID;
  v_path      TEXT;
  v_next_id   UUID;
  v_user_paid BOOLEAN;
BEGIN
  -- 1. validar pending
  SELECT * INTO v_pending
  FROM network_pending_placements
  WHERE user_id = p_user_id AND sponsor_id = p_sponsor_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending_not_found';
  END IF;

  -- 2. validar leg
  IF p_leg NOT IN ('left','right') THEN
    RAISE EXCEPTION 'invalid_leg';
  END IF;

  -- 3. CRITICO: el usuario debe haber pagado o ser founder
  SELECT
    EXISTS (SELECT 1 FROM network_positions WHERE user_id = p_user_id AND is_founder = TRUE)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_user_id
        AND subscription_plan = 'pro'
        AND stripe_subscription_id IS NOT NULL
        AND subscription_status IN ('active','trialing')
    )
  INTO v_user_paid;

  IF NOT v_user_paid THEN
    RAISE EXCEPTION 'user_not_paid: el usuario debe activar su suscripcion antes de ser colocado en la red';
  END IF;

  -- 4. buscar primer espacio libre en la pata elegida (spillover)
  v_parent_id := p_sponsor_id;
  v_path      := COALESCE((SELECT position_path FROM network_positions WHERE user_id = p_sponsor_id), '');

  LOOP
    SELECT user_id INTO v_next_id
    FROM network_positions
    WHERE placement_parent_id = v_parent_id AND leg = p_leg;

    IF NOT FOUND THEN
      EXIT;
    END IF;

    v_parent_id := v_next_id;
    v_path      := v_path || (CASE WHEN p_leg='left' THEN 'L' ELSE 'R' END);
  END LOOP;

  -- 5. insertar posicion
  INSERT INTO network_positions (user_id, sponsor_id, placement_parent_id, leg, position_path)
  VALUES (
    p_user_id,
    p_sponsor_id,
    v_parent_id,
    p_leg,
    v_path || (CASE WHEN p_leg='left' THEN 'L' ELSE 'R' END)
  );

  -- 6. marcar pending como placed
  UPDATE network_pending_placements
  SET status = 'placed', placed_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_parent_id;
END;
$body$;
