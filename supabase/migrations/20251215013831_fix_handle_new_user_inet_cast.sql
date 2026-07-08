/*
  # Fix handle_new_user inet Cast Error

  1. Changes
    - Add proper null/empty string handling for signup_ip before casting to inet
    - Only cast to inet if we have a valid non-empty IP address
    - Prevents "invalid input syntax for type inet" errors

  2. Notes
    - getClientIP() can return null if the IP lookup API fails
    - Empty strings and "null" text also need to be handled
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  signup_ip_text text;
  signup_ip_inet inet;
  device_fp text;
  user_agent_text text;
  duplicate_count integer := 0;
  account_flags_array jsonb := '[]'::jsonb;
BEGIN
  -- Extract metadata if present
  signup_ip_text := NEW.raw_user_meta_data->>'signup_ip';
  device_fp := NEW.raw_user_meta_data->>'device_fingerprint';
  user_agent_text := NEW.raw_user_meta_data->>'user_agent';

  -- Safely convert IP to inet (handle null, empty, or invalid values)
  IF signup_ip_text IS NOT NULL AND signup_ip_text != '' AND signup_ip_text != 'null' THEN
    BEGIN
      signup_ip_inet := signup_ip_text::inet;
    EXCEPTION WHEN OTHERS THEN
      signup_ip_inet := NULL;
    END;
  ELSE
    signup_ip_inet := NULL;
  END IF;

  -- Check for potential duplicates if we have fingerprint data
  IF device_fp IS NOT NULL AND device_fp != '' THEN
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
    signup_ip_inet,
    device_fp,
    user_agent_text,
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