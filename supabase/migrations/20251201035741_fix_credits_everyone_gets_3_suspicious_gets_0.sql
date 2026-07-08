/*
  # Fix Credit System - Everyone Gets 3, Suspicious Gets 0

  1. Changes
    - Normal users: 3 credits
    - Flagged/suspicious users: 0 credits
    - Update handle_new_user function

  2. Security
    - Prevents multi-account abuse
    - Legitimate users still get free credits
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  signup_ip text;
  device_fp text;
  user_agent text;
  duplicate_count integer;
BEGIN
  -- Extract metadata if present
  signup_ip := NEW.raw_user_meta_data->>'signup_ip';
  device_fp := NEW.raw_user_meta_data->>'device_fingerprint';
  user_agent := NEW.raw_user_meta_data->>'user_agent';

  -- Create user profile with tracking data
  INSERT INTO public.user_profiles (
    id, 
    email, 
    completed_jobs_count,
    signup_ip_address,
    device_fingerprint,
    signup_user_agent
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    0,
    signup_ip,
    device_fp,
    user_agent
  )
  ON CONFLICT (id) DO UPDATE SET
    signup_ip_address = COALESCE(EXCLUDED.signup_ip_address, user_profiles.signup_ip_address),
    device_fingerprint = COALESCE(EXCLUDED.device_fingerprint, user_profiles.device_fingerprint),
    signup_user_agent = COALESCE(EXCLUDED.signup_user_agent, user_profiles.signup_user_agent);

  -- Check for potential duplicates
  IF signup_ip IS NOT NULL OR device_fp IS NOT NULL THEN
    -- Check if there are recent signups from same IP or fingerprint
    SELECT COUNT(*) INTO duplicate_count
    FROM public.user_profiles
    WHERE 
      created_at > NOW() - INTERVAL '24 hours'
      AND id != NEW.id
      AND (
        (signup_ip IS NOT NULL AND signup_ip_address = signup_ip)
        OR
        (device_fp IS NOT NULL AND device_fingerprint = device_fp)
      );

    -- Flag and give 0 credits if suspicious
    IF duplicate_count > 0 THEN
      UPDATE public.user_profiles
      SET account_flags = account_flags || jsonb_build_object(
        'type', 'potential_duplicate',
        'reason', format('Found %s accounts from same IP/device in last 24h', duplicate_count),
        'flagged_at', NOW()
      )
      WHERE id = NEW.id;

      -- Suspicious users get 0 credits
      INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
      VALUES (NEW.id, 0, 0)
      ON CONFLICT (user_id) DO NOTHING;
    ELSE
      -- Normal users get 3 credits
      INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
      VALUES (NEW.id, 3, 0)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  ELSE
    -- No tracking data, assume legitimate but give 3 credits
    INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
    VALUES (NEW.id, 3, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
