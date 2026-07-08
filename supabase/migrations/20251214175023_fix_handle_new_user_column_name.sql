/*
  # Fix handle_new_user Column Name Mismatch

  1. Changes
    - Update handle_new_user function to use correct column name 'signup_user_agent' instead of 'user_agent'
    - This fixes the database error during user signup

  2. Notes
    - The column in user_profiles is named 'signup_user_agent' not 'user_agent'
    - This was causing INSERT failures in the trigger
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  signup_ip text;
  device_fp text;
  user_agent text;
  duplicate_count integer;
  account_flags_array jsonb := '[]'::jsonb;
BEGIN
  -- Extract metadata if present
  signup_ip := NEW.raw_user_meta_data->>'signup_ip';
  device_fp := NEW.raw_user_meta_data->>'device_fingerprint';
  user_agent := NEW.raw_user_meta_data->>'user_agent';

  -- Check for potential duplicates if we have fingerprint data
  IF device_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO duplicate_count
    FROM user_profiles
    WHERE device_fingerprint = device_fp
      AND created_at > now() - interval '24 hours';

    IF duplicate_count > 0 THEN
      account_flags_array := jsonb_build_array(
        jsonb_build_object(
          'type', 'potential_duplicate',
          'reason', format('Found %s accounts from same IP/device in last 24h', duplicate_count),
          'flagged_at', now()
        )
      );
    END IF;
  END IF;

  -- Create user profile with IP and fingerprint data
  INSERT INTO public.user_profiles (
    id, 
    email, 
    completed_jobs_count,
    signup_ip,
    device_fingerprint,
    signup_user_agent,
    account_flags
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    0,
    signup_ip::inet,
    device_fp,
    user_agent,
    account_flags_array
  )
  ON CONFLICT (id) DO UPDATE SET
    signup_ip = EXCLUDED.signup_ip,
    device_fingerprint = EXCLUDED.device_fingerprint,
    signup_user_agent = EXCLUDED.signup_user_agent;

  -- Create initial credits (3 for normal, 0 for flagged)
  INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
  VALUES (
    NEW.id, 
    CASE WHEN duplicate_count > 0 THEN 0 ELSE 3 END, 
    0
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;