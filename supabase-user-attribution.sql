-- ============================================================
-- Tracking de fuente de tráfico por usuario (first-touch attribution)
-- Corre este script en Supabase SQL Editor (una sola vez)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_attribution (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- UTMs (estándar Google Analytics)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  -- Click IDs de plataformas publicitarias
  fbclid text,
  gclid text,
  ttclid text,        -- TikTok
  msclkid text,       -- Bing/Microsoft
  -- Contexto general
  referrer text,      -- document.referrer al primer touch
  landing_page text,  -- ruta de la primera página visitada (ej: /oferta)
  user_agent text,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes desde el admin
CREATE INDEX IF NOT EXISTS idx_user_attribution_source ON user_attribution(utm_source);
CREATE INDEX IF NOT EXISTS idx_user_attribution_campaign ON user_attribution(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_user_attribution_created ON user_attribution(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_attribution_fbclid ON user_attribution(fbclid) WHERE fbclid IS NOT NULL;

-- RLS: el usuario puede leer su propia attribution (opcional, debug)
ALTER TABLE user_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_attribution" ON user_attribution;
CREATE POLICY "users_read_own_attribution"
  ON user_attribution FOR SELECT
  USING (auth.uid() = user_id);

-- Service role hace todo (auth callback usa service role)
DROP POLICY IF EXISTS "service_role_all_attribution" ON user_attribution;
CREATE POLICY "service_role_all_attribution"
  ON user_attribution FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
