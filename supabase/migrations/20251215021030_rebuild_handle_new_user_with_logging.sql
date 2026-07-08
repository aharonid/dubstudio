/*
  # Rebuild handle_new_user Trigger with Better Error Handling

  1. Changes
    - Simplified trigger function to isolate the issue
    - Added explicit schema references
    - Wrapped each operation in its own exception block
    - Removed potentially problematic inet cast entirely (store as text)
*/

-- Drop and recreate the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  signup_ip_text text;
  device_fp text;
  user_agent_text text;
  duplicate_count integer := 0;
  account_flags_array jsonb := '[]'::jsonb;
BEGIN
  -- Extract metadata (safely handle missing data)
  BEGIN
    signup_ip_text := NEW.raw_user_meta_data->>'signup_ip';
    device_fp := NEW.raw_user_meta_data->>'device_fingerprint';
    user_agent_text := NEW.raw_user_meta_data->>'user_agent';
  EXCEPTION WHEN OTHERS THEN
    signup_ip_text := NULL;
    device_fp := NULL;
    user_agent_text := NULL;
  END;

  -- Check for potential duplicates if we have fingerprint data
  IF device_fp IS NOT NULL AND device_fp != '' THEN
    BEGIN
      SELECT COUNT(*) INTO duplicate_count
      FROM public.user_profiles
      WHERE device_fingerprint = device_fp
        AND created_at > now() - interval '24 hours';

      IF duplicate_count > 0 THEN
        account_flags_array := jsonb_build_array(
          jsonb_build_object(
            'type', 'potential_duplicate',
            'reason', format('Found %s accounts from same device in last 24h', duplicate_count),
            'flagged_at', now()
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      duplicate_count := 0;
    END;
  END IF;

  -- Create user profile (store IP as text in signup_ip_address column)
  BEGIN
    INSERT INTO public.user_profiles (
      id, 
      email, 
      completed_jobs_count,
      signup_ip_address,
      device_fingerprint,
      signup_user_agent,
      account_flags
    )
    VALUES (
      NEW.id, 
      NEW.email, 
      0,
      signup_ip_text,
      device_fp,
      user_agent_text,
      account_flags_array
    )
    ON CONFLICT (id) DO UPDATE SET
      signup_ip_address = EXCLUDED.signup_ip_address,
      device_fingerprint = EXCLUDED.device_fingerprint,
      signup_user_agent = EXCLUDED.signup_user_agent;
  EXCEPTION WHEN OTHERS THEN
    -- If profile insert fails, log but continue
    RAISE WARNING 'Failed to create user_profile: %', SQLERRM;
  END;

  -- Create initial credits
  BEGIN
    INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
    VALUES (
      NEW.id, 
      CASE WHEN duplicate_count > 0 THEN 0 ELSE 3 END, 
      0
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If credits insert fails, log but continue
    RAISE WARNING 'Failed to create user_credits: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;