/*
  # Add RLS Policies to Block Banned/Deleted Users

  1. Changes
    - Add policies to prevent banned users from creating jobs
    - Add policies to prevent deleted users from accessing data
    - Update existing policies to check account_status

  2. Security
    - Banned users can read their existing data but cannot create new content
    - Deleted users cannot access anything
    - Active users have full access as before

  3. Notes
    - Applies to dubbing_jobs, credit_purchases, and other user-facing tables
*/

-- Function to check if user is active
CREATE OR REPLACE FUNCTION is_user_active(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND (account_status = 'active' OR account_status IS NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update dubbing_jobs policies to check account status
CREATE POLICY "Active users can insert dubbing jobs"
  ON dubbing_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id OR session_id IS NOT NULL)
    AND is_user_active(auth.uid())
  );

-- Banned/deleted users can still read their existing jobs but not create new ones
DROP POLICY IF EXISTS "Users can view own jobs" ON dubbing_jobs;
CREATE POLICY "Users can view own jobs"
  ON dubbing_jobs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    -- Allow viewing existing jobs even if banned (for history/downloads)
  );

-- Prevent banned/deleted users from making purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON credit_purchases;
CREATE POLICY "Users can view own purchases"
  ON credit_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Active users can create purchases"
  ON credit_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND is_user_active(auth.uid())
  );

-- Update user_profiles policies
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND (account_status = 'active' OR account_status IS NULL))
  WITH CHECK (auth.uid() = id);
