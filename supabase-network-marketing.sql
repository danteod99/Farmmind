-- =============================================
-- FarmMind / TrustMind — Network Marketing (Plan Binario)
-- Fase 1 MVP: link de invitacion + colocacion manual + bono directo 15%
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- ============================================================
-- 1. CODIGOS DE REFERIDO
-- ============================================================
-- Cada usuario tiene 1 codigo unico de invitacion.

CREATE TABLE IF NOT EXISTS network_referral_codes (
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_referral_codes_code
  ON network_referral_codes(code);


-- ============================================================
-- 2. POSICIONES EN LA RED BINARIA
-- ============================================================
-- Cada usuario activo tiene una posicion en el arbol binario.
-- - sponsor_id:           quien lo invito (bono directo)
-- - placement_parent_id:  bajo quien esta colocado (puede ser != sponsor por spillover)
-- - leg:                  'left' o 'right' (la pata bajo el placement_parent)
-- - position_path:        path acumulado para queries ancestrales rapidas (formato 'L/R/L')

CREATE TABLE IF NOT EXISTS network_positions (
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  sponsor_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  placement_parent_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  leg                  TEXT CHECK (leg IN ('left','right')),
  position_path        TEXT NOT NULL DEFAULT '',
  display_name         TEXT DEFAULT '',
  is_founder           BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (placement_parent_id, leg)  -- solo 1 frontal por pata
);

CREATE INDEX IF NOT EXISTS idx_network_positions_sponsor
  ON network_positions(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_network_positions_parent
  ON network_positions(placement_parent_id);
CREATE INDEX IF NOT EXISTS idx_network_positions_path
  ON network_positions(position_path text_pattern_ops);


-- ============================================================
-- 3. PENDING SIGNUPS (signups esperando colocacion del sponsor)
-- ============================================================
-- Cuando un nuevo usuario se registra con un ?ref=code, queda en
-- pending hasta que el sponsor decida colocarlo en izq o derecha.

CREATE TABLE IF NOT EXISTS network_pending_placements (
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  sponsor_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','placed','expired')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  placed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_placements_sponsor
  ON network_pending_placements(sponsor_id, status);


-- ============================================================
-- 4. COMISIONES (transacciones de pago a la red)
-- ============================================================
-- Cada vez que un suscriptor paga, se generan filas de commissions
-- correspondientes a los bonos. Fase 1: solo 'direct' (15%).
-- Fases siguientes: 'binary', 'matching', 'pool'.

CREATE TABLE IF NOT EXISTS network_commissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('direct','binary','matching','pool','rank','founder_override')),
  amount          NUMERIC(12, 2) NOT NULL,
  currency        TEXT DEFAULT 'USD',
  source_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_payment  TEXT,                    -- stripe invoice id u otro
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','reversed')),
  period          TEXT,                    -- '2026-05' (mes-ano)
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_commissions_user
  ON network_commissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_period
  ON network_commissions(period);
CREATE INDEX IF NOT EXISTS idx_commissions_source
  ON network_commissions(source_user_id);


-- ============================================================
-- 5. RPC: generar codigo de referido aleatorio
-- ============================================================

CREATE OR REPLACE FUNCTION network_generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  -- si ya existe, devolver el actual
  SELECT code INTO v_code
  FROM network_referral_codes
  WHERE user_id = p_user_id;

  IF FOUND THEN
    RETURN v_code;
  END IF;

  -- generar codigo unico de 8 caracteres alfanumericos
  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM network_referral_codes WHERE code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'No se pudo generar codigo unico despues de 10 intentos';
    END IF;
  END LOOP;

  INSERT INTO network_referral_codes (user_id, code)
  VALUES (p_user_id, v_code);

  RETURN v_code;
END;
$$;


-- ============================================================
-- 6. RPC: colocar usuario en izq/derecha (placement)
-- ============================================================
-- Llamado por el sponsor desde su dashboard.
-- Validacion: el usuario debe estar en pending_placements.
-- Si la pata ya esta ocupada con un frontal, hace spillover hacia abajo
-- buscando el primer espacio libre en esa pata.

CREATE OR REPLACE FUNCTION network_place_user(
  p_sponsor_id UUID,
  p_user_id    UUID,
  p_leg        TEXT
)
RETURNS UUID  -- placement_parent_id final
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending  RECORD;
  v_parent_id UUID;
  v_path      TEXT;
  v_next_id   UUID;
BEGIN
  -- validar pending
  SELECT * INTO v_pending
  FROM network_pending_placements
  WHERE user_id = p_user_id AND sponsor_id = p_sponsor_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending placement no encontrado para este sponsor/usuario';
  END IF;

  IF p_leg NOT IN ('left','right') THEN
    RAISE EXCEPTION 'leg debe ser left o right';
  END IF;

  -- buscar el primer espacio libre en la pata elegida del sponsor (spillover)
  v_parent_id := p_sponsor_id;
  v_path      := COALESCE((SELECT position_path FROM network_positions WHERE user_id = p_sponsor_id), '');

  LOOP
    -- ver si esa pata esta libre bajo v_parent_id
    SELECT user_id INTO v_next_id
    FROM network_positions
    WHERE placement_parent_id = v_parent_id AND leg = p_leg;

    IF NOT FOUND THEN
      EXIT;  -- libre, lo colocamos aqui
    END IF;

    -- ocupada: descender a la misma pata del frontal
    v_parent_id := v_next_id;
    v_path      := v_path || (CASE WHEN p_leg='left' THEN 'L' ELSE 'R' END);
  END LOOP;

  -- insertar posicion
  INSERT INTO network_positions (user_id, sponsor_id, placement_parent_id, leg, position_path)
  VALUES (
    p_user_id,
    p_sponsor_id,
    v_parent_id,
    p_leg,
    v_path || (CASE WHEN p_leg='left' THEN 'L' ELSE 'R' END)
  );

  -- marcar pending como placed
  UPDATE network_pending_placements
  SET status = 'placed', placed_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_parent_id;
END;
$$;


-- ============================================================
-- 7. RPC: bono directo on payment (llamado por Stripe webhook)
-- ============================================================

CREATE OR REPLACE FUNCTION network_grant_direct_bonus(
  p_payer_id      UUID,
  p_payment_amount NUMERIC,
  p_invoice_id    TEXT
)
RETURNS NUMERIC  -- monto pagado al sponsor (0 si no aplica)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sponsor_id UUID;
  v_sponsor_active BOOLEAN;
  v_bonus NUMERIC;
  v_period TEXT;
BEGIN
  -- buscar sponsor del payer
  SELECT sponsor_id INTO v_sponsor_id
  FROM network_positions
  WHERE user_id = p_payer_id;

  IF v_sponsor_id IS NULL THEN
    RETURN 0;  -- el payer no tiene sponsor (entro directo, founders, etc.)
  END IF;

  -- regla 'pago para cobrar': sponsor debe tener suscripcion activa
  -- Excepcion: founders cobran siempre
  SELECT (subscription_status = 'active' OR subscription_plan = 'pro')
    OR EXISTS (SELECT 1 FROM network_positions WHERE user_id = v_sponsor_id AND is_founder = TRUE)
  INTO v_sponsor_active
  FROM profiles
  WHERE id = v_sponsor_id;

  IF NOT COALESCE(v_sponsor_active, FALSE) THEN
    -- Sponsor inactivo: comision se comprime al siguiente upline activo (Fase 2)
    -- Por ahora: registrar como reversed
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


-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE network_referral_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_positions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_pending_placements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_commissions         ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve su propio codigo
CREATE POLICY "Users see own referral code"
  ON network_referral_codes FOR SELECT USING (auth.uid() = user_id);

-- Cada usuario ve su posicion + posiciones de su downline (5 niveles)
CREATE POLICY "Users see own position + downline"
  ON network_positions FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = sponsor_id
    OR auth.uid() = placement_parent_id
    OR EXISTS (
      SELECT 1 FROM network_positions p
      WHERE p.user_id = auth.uid()
        AND network_positions.position_path LIKE p.position_path || '%'
    )
  );

-- Cada sponsor ve sus pendings
CREATE POLICY "Sponsor sees own pendings"
  ON network_pending_placements FOR SELECT
  USING (auth.uid() = sponsor_id OR auth.uid() = user_id);

-- Cada usuario ve sus comisiones
CREATE POLICY "Users see own commissions"
  ON network_commissions FOR SELECT USING (auth.uid() = user_id);

-- Service role puede todo
CREATE POLICY "Service role manages referral codes"
  ON network_referral_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages positions"
  ON network_positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages pendings"
  ON network_pending_placements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages commissions"
  ON network_commissions FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- 9. SEED DE FUNDADORES
-- ============================================================
-- Estructura:
--   DANTE (top, no tiene sponsor ni parent)
--     ├── FLAVIO (izq)
--     └── ESTEFANY (der)
--           └── PEDRO (izq, bajo Estefany)
--
-- Reemplazar los UUIDs con los user_id reales de auth.users.
-- IMPORTANTE: ejecutar este bloque SOLO despues de que los 4 socios
-- hayan creado cuenta en auth.users.

-- Para encontrar los UUIDs:
--   SELECT id, email FROM auth.users WHERE email IN (...);

-- Ejemplo (reemplazar con UUIDs reales):
-- DO $$
-- DECLARE
--   v_dante_id    UUID := 'PEGAR_AQUI';
--   v_flavio_id   UUID := 'PEGAR_AQUI';
--   v_estefany_id UUID := 'PEGAR_AQUI';
--   v_pedro_id    UUID := 'PEGAR_AQUI';
-- BEGIN
--   -- Dante (top)
--   INSERT INTO network_positions (user_id, sponsor_id, placement_parent_id, leg, position_path, display_name, is_founder)
--   VALUES (v_dante_id, NULL, NULL, NULL, '', 'Dante (CEO)', TRUE)
--   ON CONFLICT (user_id) DO NOTHING;
--
--   -- Flavio (izq de Dante)
--   INSERT INTO network_positions (user_id, sponsor_id, placement_parent_id, leg, position_path, display_name, is_founder)
--   VALUES (v_flavio_id, v_dante_id, v_dante_id, 'left', 'L', 'Flavio (Co-fundador Senior)', TRUE)
--   ON CONFLICT (user_id) DO NOTHING;
--
--   -- Estefany (der de Dante)
--   INSERT INTO network_positions (user_id, sponsor_id, placement_parent_id, leg, position_path, display_name, is_founder)
--   VALUES (v_estefany_id, v_dante_id, v_dante_id, 'right', 'R', 'Estefany (Cofundadora)', TRUE)
--   ON CONFLICT (user_id) DO NOTHING;
--
--   -- Pedro (izq bajo Estefany)
--   INSERT INTO network_positions (user_id, sponsor_id, placement_parent_id, leg, position_path, display_name, is_founder)
--   VALUES (v_pedro_id, v_dante_id, v_estefany_id, 'left', 'RL', 'Pedro (Cofundador)', TRUE)
--   ON CONFLICT (user_id) DO NOTHING;
--
--   -- Generar codigos de referido
--   PERFORM network_generate_referral_code(v_dante_id);
--   PERFORM network_generate_referral_code(v_flavio_id);
--   PERFORM network_generate_referral_code(v_estefany_id);
--   PERFORM network_generate_referral_code(v_pedro_id);
-- END $$;


-- ============================================================
-- FIN del schema. Para deshacer: DROP TABLE network_* CASCADE;
-- ============================================================
