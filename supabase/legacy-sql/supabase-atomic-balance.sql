-- ============================================================
-- Atomic balance operations to prevent race conditions
-- Run this migration in your Supabase SQL editor
-- ============================================================

-- 1. Decrement balance atomically (for placing orders)
-- Returns the new balance, or raises an exception if insufficient funds
CREATE OR REPLACE FUNCTION decrement_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE smm_balances
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- 2. Increment balance atomically (for payments/credits)
-- Creates the row if it doesn't exist (upsert), returns new balance
CREATE OR REPLACE FUNCTION increment_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  INSERT INTO smm_balances (user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = smm_balances.balance + p_amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- 3. Decrement reseller balance atomically
CREATE OR REPLACE FUNCTION decrement_reseller_balance(p_reseller_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE smm_resellers
  SET balance = balance - p_amount
  WHERE id = p_reseller_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_reseller_balance';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- 4. Increment reseller balance atomically (for refunds)
CREATE OR REPLACE FUNCTION increment_reseller_balance(p_reseller_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE smm_resellers
  SET balance = balance + p_amount
  WHERE id = p_reseller_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reseller_not_found';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- 5. Increment promo code usage atomically (prevents race condition on current_uses)
-- Only increments if current_uses < max_uses, otherwise raises an exception
CREATE OR REPLACE FUNCTION increment_promo_uses(p_promo_id UUID, p_max_uses INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = p_promo_id
    AND current_uses < p_max_uses;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'promo_max_uses_reached';
  END IF;
END;
$$;

-- 5. Add a CHECK constraint to prevent negative balances (safety net)
-- This will fail silently if constraint already exists
DO $$
BEGIN
  ALTER TABLE smm_balances ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
