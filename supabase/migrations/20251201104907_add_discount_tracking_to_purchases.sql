/*
  # Add Discount Tracking to Credit Purchases

  1. Changes to `credit_purchases` table
    - Add `original_amount_usd` (numeric) - Original price before discounts
    - Add `discount_amount_usd` (numeric) - Total discount applied
    - Add `coupon_code` (text) - Coupon/promo code used (if any)
    - Update `amount_usd` to represent final amount after discount

  2. Notes
    - `amount_usd` now represents the actual amount charged (after discounts)
    - `original_amount_usd` stores the base price before any discounts
    - `discount_amount_usd` = original_amount_usd - amount_usd
    - `coupon_code` stores the promotion code used for reference
*/

-- Add discount tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_purchases' AND column_name = 'original_amount_usd'
  ) THEN
    ALTER TABLE credit_purchases ADD COLUMN original_amount_usd numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_purchases' AND column_name = 'discount_amount_usd'
  ) THEN
    ALTER TABLE credit_purchases ADD COLUMN discount_amount_usd numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_purchases' AND column_name = 'coupon_code'
  ) THEN
    ALTER TABLE credit_purchases ADD COLUMN coupon_code text;
  END IF;
END $$;

-- Backfill existing purchases (set original_amount_usd = amount_usd for existing records)
UPDATE credit_purchases 
SET original_amount_usd = amount_usd, discount_amount_usd = 0
WHERE original_amount_usd IS NULL;
