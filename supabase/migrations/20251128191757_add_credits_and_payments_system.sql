/*
  # Add Credits and Payments System

  1. New Tables
    - `user_credits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `credits_minutes` (integer) - Total minutes available
      - `credits_used` (integer) - Total minutes used
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `credit_purchases`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `stripe_payment_intent_id` (text, unique)
      - `stripe_checkout_session_id` (text, unique)
      - `amount_usd` (numeric) - Amount paid in USD
      - `credits_minutes` (integer) - Minutes purchased
      - `package_name` (text) - e.g., "Starter Pack"
      - `status` (text) - pending, completed, failed, refunded
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `dubbing_job_id` (uuid, references dubbing_jobs)
      - `credits_used` (integer) - Minutes deducted
      - `balance_before` (integer)
      - `balance_after` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read their own credits and transactions
    - Only authenticated users can access their data
*/

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credits_minutes integer NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credit_purchases table
CREATE TABLE IF NOT EXISTS credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  amount_usd numeric(10, 2) NOT NULL,
  credits_minutes integer NOT NULL,
  package_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dubbing_job_id uuid REFERENCES dubbing_jobs(id) ON DELETE SET NULL,
  credits_used integer NOT NULL,
  balance_before integer NOT NULL,
  balance_after integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON user_credits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for credit_purchases
CREATE POLICY "Users can view own purchases"
  ON credit_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON credit_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_stripe_payment_intent ON credit_purchases(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_stripe_checkout_session ON credit_purchases(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_dubbing_job_id ON credit_transactions(dubbing_job_id);

-- Function to initialize credits for new users
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, credits_minutes, credits_used)
  VALUES (NEW.id, 10, 0); -- Give 10 free minutes to new users
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create credits for new users
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_credits();

-- Add credits_used column to dubbing_jobs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN credits_used integer DEFAULT 0;
  END IF;
END $$;