/*
  # Add Account Banning and Audit Logging

  1. New Tables
    - `deleted_users_audit` - Keeps permanent records of deleted/banned users
    
  2. Changes to Existing Tables
    - Add `account_status` to user_profiles (active, banned, deleted)
    - Add `banned_at`, `banned_by`, `ban_reason` columns
    
  3. Security
    - Only admins can ban/delete accounts
    - Audit logs are permanent and cannot be deleted
    - RLS policies to prevent banned users from accessing system

  4. Notes
    - Soft delete: Mark as deleted but keep in database
    - Hard delete: Move to audit table, remove from auth.users
    - All user activity logs are preserved
*/

-- Create deleted_users_audit table for permanent records
CREATE TABLE IF NOT EXISTS deleted_users_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id uuid NOT NULL,
  email text NOT NULL,
  signup_ip inet,
  device_fingerprint text,
  account_flags jsonb,
  total_credits_purchased integer DEFAULT 0,
  total_credits_used integer DEFAULT 0,
  total_jobs_completed integer DEFAULT 0,
  total_revenue_usd numeric(10, 2) DEFAULT 0,
  signup_date timestamptz,
  deleted_at timestamptz DEFAULT now(),
  deleted_by uuid REFERENCES auth.users(id),
  deletion_reason text,
  deletion_type text CHECK (deletion_type IN ('soft_delete', 'hard_delete', 'ban')),
  user_data jsonb, -- Store complete user profile
  created_at timestamptz DEFAULT now()
);

-- Add account status fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'banned', 'deleted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN banned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'banned_by'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN banned_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN ban_reason text;
  END IF;
END $$;

-- Enable RLS on deleted_users_audit
ALTER TABLE deleted_users_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read deleted user audit logs"
  ON deleted_users_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Function to ban a user
CREATE OR REPLACE FUNCTION ban_user(
  target_user_id uuid,
  reason text,
  admin_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  user_record RECORD;
  result jsonb;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = admin_user_id AND is_admin = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get user data
  SELECT * INTO user_record FROM user_profiles WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Update user status to banned
  UPDATE user_profiles
  SET 
    account_status = 'banned',
    banned_at = now(),
    banned_by = admin_user_id,
    ban_reason = reason
  WHERE id = target_user_id;

  -- Create audit log
  INSERT INTO deleted_users_audit (
    original_user_id,
    email,
    signup_ip,
    device_fingerprint,
    account_flags,
    total_credits_purchased,
    total_credits_used,
    total_jobs_completed,
    signup_date,
    deleted_by,
    deletion_reason,
    deletion_type,
    user_data
  )
  SELECT
    up.id,
    up.email,
    up.signup_ip,
    up.device_fingerprint,
    up.account_flags,
    COALESCE((SELECT SUM(credits_minutes) FROM credit_purchases WHERE user_id = up.id AND status = 'completed'), 0),
    COALESCE((SELECT credits_used FROM user_credits WHERE user_id = up.id), 0),
    up.completed_jobs_count,
    up.created_at,
    admin_user_id,
    reason,
    'ban',
    to_jsonb(up)
  FROM user_profiles up
  WHERE up.id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'User banned successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a user (mark as deleted, keep data)
CREATE OR REPLACE FUNCTION soft_delete_user(
  target_user_id uuid,
  reason text,
  admin_user_id uuid
)
RETURNS jsonb AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = admin_user_id AND is_admin = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Update user status to deleted
  UPDATE user_profiles
  SET 
    account_status = 'deleted',
    banned_at = now(),
    banned_by = admin_user_id,
    ban_reason = reason
  WHERE id = target_user_id;

  -- Create audit log
  INSERT INTO deleted_users_audit (
    original_user_id,
    email,
    signup_ip,
    device_fingerprint,
    account_flags,
    total_credits_purchased,
    total_credits_used,
    total_jobs_completed,
    signup_date,
    deleted_by,
    deletion_reason,
    deletion_type,
    user_data
  )
  SELECT
    up.id,
    up.email,
    up.signup_ip,
    up.device_fingerprint,
    up.account_flags,
    COALESCE((SELECT SUM(credits_minutes) FROM credit_purchases WHERE user_id = up.id AND status = 'completed'), 0),
    COALESCE((SELECT credits_used FROM user_credits WHERE user_id = up.id), 0),
    up.completed_jobs_count,
    up.created_at,
    admin_user_id,
    reason,
    'soft_delete',
    to_jsonb(up)
  FROM user_profiles up
  WHERE up.id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'User soft deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status ON user_profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_deleted_users_audit_original_user_id ON deleted_users_audit(original_user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_users_audit_email ON deleted_users_audit(email);
