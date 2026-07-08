/*
  # Update handle_new_user to capture fingerprint data

  1. Changes
    - Update handle_new_user function to accept metadata from signup
    - Extract IP address, device fingerprint from user metadata
    - Store in user_profiles for abuse detection

  2. Notes
    - Metadata is passed from frontend during signup
    - Used only for fraud prevention
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  signup_ip text;
  device_fp text;
  user_agent text;
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
    DECLARE
      duplicate_count integer;
    BEGIN
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

      -- Flag if suspicious
      IF duplicate_count > 0 THEN
        UPDATE public.user_profiles
        SET account_flags = account_flags || jsonb_build_object(
          'type', 'potential_duplicate',
          'reason', format('Found %s accounts from same IP/device in last 24h', duplicate_count),
          'flagged_at', NOW()
        )
        WHERE id = NEW.id;

        -- Reduce free credits for flagged accounts (3 instead of 10)
        INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
        VALUES (NEW.id, 3, 0)
        ON CONFLICT (user_id) DO NOTHING;
      ELSE
        -- Normal signup gets 10 credits
        INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
        VALUES (NEW.id, 10, 0)
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
    END;
  ELSE
    -- No tracking data, give reduced credits
    INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
    VALUES (NEW.id, 3, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
