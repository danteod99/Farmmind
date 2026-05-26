-- ════════════════════════════════════════════════════════════════════════
--  TRUSTMIND SECURITY FIX — Row Level Security
--  Fecha: 2026-05-26
--  Origen: Informe de vulnerabilidades del investigador independiente
--
--  CONTIENE:
--    PARTE A · RLS policies (aplicar YA — sin downtime)
--    PARTE B · Rotación de api_keys de resellers (LEER antes de aplicar)
--
--  CÓMO APLICAR:
--  1. Supabase Dashboard → SQL Editor → New query
--  2. Copiar PARTE A entera (sin PARTE B)
--  3. Click "Run"
--  4. Verificar con: GET /api/debug/rls-audit
--  5. Aplicar PARTE B SOLO después de coordinar con resellers
--
--  ROLLBACK: cada bloque tiene comentario con cómo deshacer
-- ════════════════════════════════════════════════════════════════════════


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ PARTE A · RLS POLICIES (URGENTE — APLICAR AHORA)                    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ─── 1. smm_balances ────────────────────────────────────────────────────
ALTER TABLE smm_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smm_balances_self_read" ON smm_balances;
CREATE POLICY "smm_balances_self_read" ON smm_balances
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── 2. smm_orders ──────────────────────────────────────────────────────
ALTER TABLE smm_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smm_orders_self_read" ON smm_orders;
CREATE POLICY "smm_orders_self_read" ON smm_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── 3. smm_transactions ────────────────────────────────────────────────
ALTER TABLE smm_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smm_transactions_self_read" ON smm_transactions;
CREATE POLICY "smm_transactions_self_read" ON smm_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── 4. smm_resellers ───────────────────────────────────────────────────
ALTER TABLE smm_resellers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smm_resellers_self_read" ON smm_resellers;
CREATE POLICY "smm_resellers_self_read" ON smm_resellers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── 5. smm_reseller_prices ─────────────────────────────────────────────
ALTER TABLE smm_reseller_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smm_reseller_prices_owner_read" ON smm_reseller_prices;
CREATE POLICY "smm_reseller_prices_owner_read" ON smm_reseller_prices
  FOR SELECT TO authenticated
  USING (
    reseller_id IN (
      SELECT id FROM smm_resellers WHERE user_id = auth.uid()
    )
  );

-- ─── 6. promo_codes ─────────────────────────────────────────────────────
-- Nadie lee la tabla entera. La validación se hace server-side con service_role.
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
-- (Sin policies = anon/authenticated bloqueados, service_role pasa.)

-- ─── 7. network_pending_placements ──────────────────────────────────────
ALTER TABLE network_pending_placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "network_pending_self" ON network_pending_placements;
CREATE POLICY "network_pending_self" ON network_pending_placements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = sponsor_id);

-- ─── 8. courses ─────────────────────────────────────────────────────────
-- Catálogo es lectura pública pero solo cursos activos.
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "courses_public_read" ON courses;
CREATE POLICY "courses_public_read" ON courses
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- ─── 9. tm_subscriptions ────────────────────────────────────────────────
ALTER TABLE tm_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_subscriptions_self" ON tm_subscriptions;
CREATE POLICY "tm_subscriptions_self" ON tm_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── 10. network_positions ──────────────────────────────────────────────
-- Fix infinite recursion: drop TODAS las políticas viejas, crear una limpia.
ALTER TABLE network_positions ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'network_positions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON network_positions', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "network_positions_self" ON network_positions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = placement_parent_id);

-- ─── 11. RLS preventiva en tablas ya protegidas (no daña, asegura) ──────
ALTER TABLE IF EXISTS course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tm_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS smm_autorecharge ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ─── Verificación post-fix ──────────────────────────────────────────────
-- Después del COMMIT, corre esto para confirmar que TODAS las tablas
-- críticas tengan rowsecurity = true:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'smm_balances','smm_orders','smm_transactions','smm_resellers',
--     'smm_reseller_prices','promo_codes','network_pending_placements',
--     'courses','tm_subscriptions','network_positions'
--   );

-- ─── ROLLBACK de PARTE A ────────────────────────────────────────────────
-- Si algo se rompe en producción, deshacer con:
--
-- BEGIN;
-- ALTER TABLE smm_balances DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE smm_orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE smm_transactions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE smm_resellers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE smm_reseller_prices DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE promo_codes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE network_pending_placements DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tm_subscriptions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE network_positions DISABLE ROW LEVEL SECURITY;
-- COMMIT;


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ PARTE B · ROTACIÓN DE API KEYS                                       ║
-- ║                                                                      ║
-- ║ ⚠️ NO EJECUTES AÚN sin coordinar con resellers.                       ║
-- ║ Esto invalida todas las API keys actuales. Cualquier reseller con   ║
-- ║ una integración custom va a dejar de funcionar hasta que actualicen ║
-- ║ su key.                                                              ║
-- ║                                                                      ║
-- ║ PROCESO RECOMENDADO:                                                 ║
-- ║   1. Manda WhatsApp a tus resellers avisando con 24-48h de margen   ║
-- ║   2. Ejecuta este bloque cuando la mayoría esté lista                ║
-- ║   3. Cada reseller entra a /panel/[slug]/api y copia su nueva key   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

/*
BEGIN;

-- Backup de keys actuales por compliance/auditoría
CREATE TABLE IF NOT EXISTS smm_resellers_keys_backup_20260526 AS
SELECT id, user_id, api_key AS old_api_key, company_name, NOW() AS backed_up_at
FROM smm_resellers;

-- Rotar todas las api_keys
UPDATE smm_resellers
SET api_key = encode(gen_random_bytes(24), 'hex'),
    updated_at = NOW();

-- Confirmar
SELECT COUNT(*) AS keys_rotated FROM smm_resellers;

COMMIT;
*/
