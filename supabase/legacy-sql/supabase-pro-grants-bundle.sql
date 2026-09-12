-- ============================================================
-- Al suscribirse a TrustMind Pro, se activa automáticamente el
-- bundle (TrustInsta + TrustFace) en tm_subscriptions.
-- Requiere:
--   1. Columna stripe_subscription_id en tm_subscriptions
--   2. UNIQUE constraint (user_id, product) para upsert
-- Correr en Supabase SQL Editor (una sola vez).
-- ============================================================

ALTER TABLE tm_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS idx_tm_subscriptions_stripe_sub
  ON tm_subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Unique constraint: un usuario solo tiene una fila por producto
DO $$
BEGIN
  ALTER TABLE tm_subscriptions
    ADD CONSTRAINT tm_subscriptions_user_product_unique UNIQUE (user_id, product);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN
    -- Si existen duplicados, quedarse con el de expires_at más lejano
    DELETE FROM tm_subscriptions a USING tm_subscriptions b
    WHERE a.user_id = b.user_id
      AND a.product = b.product
      AND a.id < b.id;
    ALTER TABLE tm_subscriptions
      ADD CONSTRAINT tm_subscriptions_user_product_unique UNIQUE (user_id, product);
END;
$$;
