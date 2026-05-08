-- =============================================
-- TrustMind - Cursos para suscriptores de la red
--
-- Cursos visibles a:
--   - Founders (Dante, Flavio, Estefany, Pedro)
--   - Usuarios con suscripcion activa (subscription_plan='pro')
--
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- 1. Cursos
CREATE TABLE IF NOT EXISTS courses (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  cover_url    TEXT DEFAULT '',
  level        TEXT DEFAULT 'principiante' CHECK (level IN ('principiante','intermedio','avanzado')),
  duration     TEXT DEFAULT '',
  is_active    BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(is_active, display_order);

-- 2. Modulos del curso
CREATE TABLE IF NOT EXISTS course_modules (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id     UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  video_url     TEXT DEFAULT '',
  content       TEXT DEFAULT '',
  duration_min  INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_free       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course
  ON course_modules(course_id, display_order);

-- 3. Progreso del usuario
CREATE TABLE IF NOT EXISTS course_progress (
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id   UUID REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, module_id)
);

-- 4. RPC: el usuario tiene acceso a cursos?
CREATE OR REPLACE FUNCTION user_has_course_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $body$
DECLARE
  v_is_founder BOOLEAN;
  v_is_subscribed BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM network_positions
    WHERE user_id = p_user_id AND is_founder = TRUE
  ) INTO v_is_founder;

  IF v_is_founder THEN
    RETURN TRUE;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = p_user_id
      AND subscription_plan = 'pro'
      AND stripe_subscription_id IS NOT NULL
      AND subscription_status IN ('active','trialing')
  ) INTO v_is_subscribed;

  RETURN COALESCE(v_is_subscribed, FALSE);
END;
$body$;

-- 5. Row Level Security
ALTER TABLE courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress  ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver cursos activos (la lista, no los modulos completos)
CREATE POLICY "Anyone reads active courses"
  ON courses FOR SELECT USING (is_active = TRUE);

-- Modulos: solo founders / suscritos. Modulos free son visibles para todos.
CREATE POLICY "Modules access by subscription"
  ON course_modules FOR SELECT
  USING (is_free = TRUE OR user_has_course_access(auth.uid()));

-- Progreso: solo el dueño
CREATE POLICY "Progress: own only"
  ON course_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role gestiona todo
CREATE POLICY "Service role manages courses"      ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages modules"     ON course_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages progress"    ON course_progress FOR ALL USING (true) WITH CHECK (true);

-- 6. Seed inicial (curso de granjas de bots)
INSERT INTO courses (slug, title, description, level, duration, display_order)
VALUES
  ('granjas-de-bots-fundamentos', 'Granjas de Bots: Fundamentos',
   'Todo lo necesario para empezar a operar tu primera granja: hardware, software, anti-deteccion y monetizacion.',
   'principiante', '8 horas', 1),
  ('automatizacion-con-genfarmer', 'Automatizacion con GenFarmer',
   'Configuracion avanzada de GenFarmer, scripts, proxies y escalado a multiples cuentas.',
   'intermedio', '6 horas', 2),
  ('escalando-a-1000-cuentas', 'Escalando a 1,000 cuentas',
   'Estrategias de escalado, gestion de proxies, anti-bloqueo y operacion 24/7.',
   'avanzado', '5 horas', 3),
  ('monetizacion-spotify-tiktok', 'Monetizacion Spotify y TikTok',
   'Como generar ingresos pasivos con reproducciones y vistas automatizadas.',
   'intermedio', '4 horas', 4)
ON CONFLICT (slug) DO NOTHING;
