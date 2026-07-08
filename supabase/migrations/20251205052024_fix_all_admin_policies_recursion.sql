/*
  # Fix All Admin Policies Infinite Recursion

  1. Problem
    - Multiple tables still have admin policies causing infinite recursion
    - Tables affected: login_history, feedback_submissions, deleted_users_audit
    - All use direct EXISTS checks on user_profiles which trigger RLS loops

  2. Solution
    - Drop all broken policies
    - Recreate using the safe is_admin() SECURITY DEFINER function
    - Ensures no RLS recursion while maintaining security

  3. Tables Fixed
    - login_history (SELECT policy)
    - feedback_submissions (SELECT and UPDATE policies)
    - deleted_users_audit (SELECT policy)
*/

-- Fix login_history policies
DROP POLICY IF EXISTS "Admins can read all login history" ON login_history;

CREATE POLICY "Admins can read all login history"
  ON login_history
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Fix feedback_submissions policies
DROP POLICY IF EXISTS "Admin can view all feedback" ON feedback_submissions;
DROP POLICY IF EXISTS "Admin can update feedback" ON feedback_submissions;

CREATE POLICY "Admin can view all feedback"
  ON feedback_submissions
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can update feedback"
  ON feedback_submissions
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix deleted_users_audit policies
DROP POLICY IF EXISTS "Admins can read deleted user audit logs" ON deleted_users_audit;

CREATE POLICY "Admins can read deleted user audit logs"
  ON deleted_users_audit
  FOR SELECT
  TO authenticated
  USING (is_admin());
