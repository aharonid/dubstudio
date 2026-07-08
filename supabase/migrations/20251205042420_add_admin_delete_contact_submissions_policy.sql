/*
  # Add Admin Delete Policy for Contact Submissions

  1. New Policy
    - Allow admin users to delete contact submissions

  2. Security
    - Only users with is_admin = true can delete submissions
    - Enables proper management of contact form spam and old messages
*/

-- Allow admin users to delete contact submissions
CREATE POLICY "Admin can delete contact submissions"
  ON contact_submissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
