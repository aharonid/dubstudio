/*
  # Add Admin Read All Credits Policy

  1. Problem
    - Admins can only see their own credits due to RLS
    - Admin dashboard needs to show all users' credit info

  2. Solution
    - Add policy allowing admins to read ALL user credits
    - Required for admin user management

  3. Security
    - Only users with is_admin = true can read all credits
    - Regular users still restricted to own credits
*/

-- Allow admins to read all user credits
CREATE POLICY "Admins can read all credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );