-- ============================================================
-- Security RPC Functions for atomic balance operations
-- Run this in Supabase SQL Editor
-- ============================================================

-- Increment balance atomically (for credits/payments)
CREATE OR REPLACE FUNCTION increment_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  INSERT INTO smm_balances (user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = smm_balances.balance + p_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement balance atomically (for orders)
-- Returns the new balance, or raises an exception if insufficient funds
CREATE OR REPLACE FUNCTION decrement_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_current NUMERIC;
  v_new NUMERIC;
BEGIN
  SELECT balance INTO v_current
  FROM smm_balances
  WHERE user_id = p_user_id
  FOR UPDATE; -- Row-level lock prevents race conditions

  IF v_current IS NULL OR v_current < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', COALESCE(v_current, 0), p_amount;
  END IF;

  v_new := v_current - p_amount;

  UPDATE smm_balances
  SET balance = v_new, updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement reseller balance atomically
-- (if not already created)
CREATE OR REPLACE FUNCTION decrement_reseller_balance(p_reseller_id UUID, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_current NUMERIC;
  v_new NUMERIC;
BEGIN
  SELECT balance INTO v_current
  FROM smm_resellers
  WHERE id = p_reseller_id
  FOR UPDATE;

  IF v_current IS NULL OR v_current < p_amount THEN
    RAISE EXCEPTION 'Insufficient reseller balance';
  END IF;

  v_new := v_current - p_amount;

  UPDATE smm_resellers
  SET balance = v_new
  WHERE id = p_reseller_id;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
