/*
  # Fix Admin Policies Infinite Recursion

  1. Problem
    - Admin policies cause infinite recursion
    - Checking user_profiles.is_admin triggers RLS on user_profiles
    - This creates a loop: policy -> check user_profiles -> policy -> check user_profiles...

  2. Solution
    - Drop the broken policies
    - Create a SECURITY DEFINER function to check admin status (bypasses RLS)
    - Recreate policies using the safe function

  3. Security
    - Function uses SECURITY DEFINER to bypass RLS for admin check only
    - Still maintains security - only checks the calling user's admin status
*/

-- Drop the broken policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all credits" ON user_credits;
DROP POLICY IF EXISTS "Admins can read all purchases" ON credit_purchases;

-- Create a helper function that checks if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create the policies using the safe function
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can read all credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can read all purchases"
  ON credit_purchases
  FOR SELECT
  TO authenticated
  USING (is_admin());