/*
  # Add Admin Update Policy for User Profiles

  1. Changes
    - Add RLS policy to allow admins to update any user's profile
    - This enables the flag toggle functionality in the admin panel

  2. Security
    - Only users with is_admin=true can update other users' profiles
    - Regular users can still only update their own profiles
*/

-- Allow admins to update any user's profile
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
