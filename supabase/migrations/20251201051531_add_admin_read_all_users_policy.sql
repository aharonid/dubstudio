/*
  # Add Admin Read All Users Policy

  1. Problem
    - Admins can only see their own profile due to RLS
    - Admin dashboard shows incomplete user list

  2. Solution
    - Add policy allowing admins to read ALL user profiles
    - Admins need this to manage users

  3. Security
    - Only users with is_admin = true can read all profiles
    - Regular users still restricted to own profile
*/

-- Allow admins to read all user profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );