/*
  # Fix Quiz Responses Admin Policy Infinite Recursion

  1. Problem
    - quiz_responses table has admin policy causing infinite recursion
    - Policy uses direct EXISTS check on user_profiles which triggers RLS loop
    - This freezes the UI when admins try to access quiz data

  2. Solution
    - Drop the broken policy
    - Recreate using the safe is_admin() SECURITY DEFINER function
    - Prevents RLS recursion while maintaining security

  3. Security
    - Uses existing is_admin() function (SECURITY DEFINER)
    - Only checks calling user's admin status without RLS loops
*/

-- Drop the broken policy
DROP POLICY IF EXISTS "Admin can view all quiz responses" ON quiz_responses;

-- Recreate using the safe is_admin() function
CREATE POLICY "Admin can view all quiz responses"
  ON quiz_responses
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Also add missing admin insert policy for data management
CREATE POLICY "Admin can insert quiz responses"
  ON quiz_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());
