/*
  # Add Insert Policy for Login History

  1. Changes
    - Add INSERT policy to allow authenticated users to log their own logins
  
  2. Security
    - Users can only insert login records for themselves (auth.uid())
*/

CREATE POLICY "Users can insert own login history"
  ON login_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
