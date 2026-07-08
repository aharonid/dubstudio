/*
  # Add Admin Read All Purchases Policy

  1. Problem
    - Admins can only see their own purchases due to RLS
    - Admin dashboard needs to check if users have purchased

  2. Solution
    - Add policy allowing admins to read ALL credit purchases
    - Needed to show PAID vs FREE status in admin panel

  3. Security
    - Only users with is_admin = true can read all purchases
    - Regular users still restricted to own purchases
*/

-- Allow admins to read all credit purchases
CREATE POLICY "Admins can read all purchases"
  ON credit_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );