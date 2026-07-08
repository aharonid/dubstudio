/*
  # Add Admin Policy for Contact Submissions

  1. New Policy
    - Allow admin users to read all contact submissions
    - Allow admin users to update contact submission status

  2. Security
    - Only users with is_admin = true can access submissions
*/

-- Drop existing restrictive policies if they prevent admin access
DROP POLICY IF EXISTS "Admin can view all contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admin can update contact submissions" ON contact_submissions;

-- Allow admin users to view all contact submissions
CREATE POLICY "Admin can view all contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Allow admin users to update contact submission status
CREATE POLICY "Admin can update contact submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
