/*
  # Fix Admin Check - Use Auth Metadata Instead of RLS Table

  1. Problem
    - is_admin() function queries user_profiles table
    - This triggers RLS policies even with SECURITY DEFINER
    - Creates infinite recursion when admin policies call is_admin()

  2. Solution
    - Store is_admin flag in auth.users.raw_app_meta_data (no RLS)
    - Update is_admin() function to check auth metadata instead
    - Migrate existing admin users to have metadata set
    - Update trigger to set metadata on new user creation

  3. Security
    - raw_app_meta_data cannot be modified by users
    - Only server-side code can update it
    - Breaks the RLS recursion chain completely
*/

-- First, migrate existing admin users to auth metadata
DO $$
DECLARE
  admin_user RECORD;
BEGIN
  FOR admin_user IN 
    SELECT id FROM user_profiles WHERE is_admin = true
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      '{"is_admin": true}'::jsonb
    WHERE id = admin_user.id;
  END LOOP;
END $$;

-- Update is_admin() to check auth metadata instead of user_profiles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (raw_app_meta_data->>'is_admin')::boolean 
     FROM auth.users 
     WHERE id = auth.uid()),
    false
  );
$$;

-- Update handle_new_user trigger to set auth metadata for admins
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  fingerprint_val text;
  ip_val text;
  is_suspicious boolean := false;
  initial_credits integer := 180;
BEGIN
  fingerprint_val := NEW.raw_user_meta_data->>'fingerprint';
  ip_val := NEW.raw_user_meta_data->>'ip_address';

  IF fingerprint_val IS NOT NULL THEN
    SELECT COUNT(*) > 0 INTO is_suspicious
    FROM user_profiles
    WHERE browser_fingerprint = fingerprint_val;
  END IF;

  IF is_suspicious THEN
    initial_credits := 0;
  END IF;

  INSERT INTO user_profiles (
    id,
    email,
    browser_fingerprint,
    signup_ip_address,
    is_admin
  ) VALUES (
    NEW.id,
    NEW.email,
    fingerprint_val,
    ip_val,
    COALESCE((NEW.raw_app_meta_data->>'is_admin')::boolean, false)
  );

  INSERT INTO user_credits (user_id, credits_remaining, total_earned, total_spent)
  VALUES (NEW.id, initial_credits, initial_credits, 0);

  INSERT INTO login_history (user_id, ip_address, user_agent, login_method)
  VALUES (
    NEW.id,
    ip_val,
    NEW.raw_user_meta_data->>'user_agent',
    'email'
  );

  RETURN NEW;
END;
$$;
