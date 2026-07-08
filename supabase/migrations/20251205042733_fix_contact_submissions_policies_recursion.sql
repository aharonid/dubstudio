/*
  # Fix Contact Submissions Policies Infinite Recursion

  1. Problem
    - Contact submissions admin policies cause infinite recursion
    - Checking user_profiles.is_admin directly triggers RLS on user_profiles
    - This creates a loop when loading the admin dashboard

  2. Solution
    - Drop the broken policies that use direct EXISTS checks
    - Recreate policies using the safe is_admin() SECURITY DEFINER function
    - This bypasses RLS for the admin check only

  3. Security
    - Uses existing is_admin() function which is already SECURITY DEFINER
    - Maintains security - only checks the calling user's admin status
*/

-- Drop the broken policies
DROP POLICY IF EXISTS "Admin can view all contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admin can update contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admin can delete contact submissions" ON contact_submissions;

-- Recreate policies using the safe is_admin() function
CREATE POLICY "Admin can view all contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can update contact submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete contact submissions"
  ON contact_submissions
  FOR DELETE
  TO authenticated
  USING (is_admin());
