/*
  # Add Anti-Abuse Tracking

  1. Changes
    - Add signup tracking fields to user_profiles
    - Track IP address, device fingerprint, and referrer
    - Create indexes for abuse detection queries
    - Add function to detect potential duplicate accounts

  2. Security
    - IP addresses stored securely
    - Used only for fraud detection
    - Compliant with privacy policies
*/

-- Add tracking columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'signup_ip_address'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signup_ip_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'device_fingerprint'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN device_fingerprint text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'signup_user_agent'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signup_user_agent text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'account_flags'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN account_flags jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create indexes for abuse detection
CREATE INDEX IF NOT EXISTS idx_signup_ip_address ON user_profiles(signup_ip_address);
CREATE INDEX IF NOT EXISTS idx_device_fingerprint ON user_profiles(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_account_flags ON user_profiles USING gin(account_flags);

-- Function to detect potential duplicate accounts
CREATE OR REPLACE FUNCTION detect_duplicate_accounts(
  check_ip text DEFAULT NULL,
  check_fingerprint text DEFAULT NULL,
  hours_window integer DEFAULT 24
)
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  match_reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    au.email,
    up.created_at,
    CASE 
      WHEN up.signup_ip_address = check_ip AND up.device_fingerprint = check_fingerprint 
        THEN 'exact_match'
      WHEN up.signup_ip_address = check_ip 
        THEN 'ip_match'
      WHEN up.device_fingerprint = check_fingerprint 
        THEN 'fingerprint_match'
      ELSE 'no_match'
    END as match_reason
  FROM user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE 
    up.created_at > NOW() - (hours_window || ' hours')::interval
    AND (
      (check_ip IS NOT NULL AND up.signup_ip_address = check_ip)
      OR
      (check_fingerprint IS NOT NULL AND up.device_fingerprint = check_fingerprint)
    )
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to flag suspicious accounts
CREATE OR REPLACE FUNCTION flag_account(
  target_user_id uuid,
  flag_type text,
  flag_reason text
)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET account_flags = account_flags || jsonb_build_object(
    'type', flag_type,
    'reason', flag_reason,
    'flagged_at', NOW()
  )
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION detect_duplicate_accounts IS 'Detects potential duplicate accounts based on IP and device fingerprint within a time window';
COMMENT ON FUNCTION flag_account IS 'Flags an account for suspicious activity';
