/*
  # Backfill Missing User Profiles

  1. Purpose
    - Ensure ALL users in auth.users have a profile in user_profiles
    - Some users might have signed up but profile wasn't created
    
  2. Changes
    - Creates missing profiles for any auth users without one
    - Sets completed_jobs_count to 0 for new profiles
    - Initializes user_credits if missing
    
  3. Security
    - Uses SECURITY DEFINER to access auth.users
*/

-- Function to backfill missing profiles
CREATE OR REPLACE FUNCTION backfill_missing_profiles()
RETURNS TABLE(users_added integer, credits_added integer) AS $$
DECLARE
  profiles_created integer := 0;
  credits_created integer := 0;
BEGIN
  -- Insert missing profiles
  WITH inserted AS (
    INSERT INTO public.user_profiles (id, email, completed_jobs_count)
    SELECT 
      au.id,
      au.email,
      0
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO profiles_created FROM inserted;
  
  -- Insert missing credits (for profiles that exist but have no credits)
  WITH inserted_credits AS (
    INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
    SELECT 
      up.id,
      3,
      0
    FROM public.user_profiles up
    LEFT JOIN public.user_credits uc ON up.id = uc.user_id
    WHERE uc.user_id IS NULL
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id
  )
  SELECT COUNT(*) INTO credits_created FROM inserted_credits;
  
  RETURN QUERY SELECT profiles_created, credits_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the backfill
SELECT * FROM backfill_missing_profiles();

COMMENT ON FUNCTION backfill_missing_profiles IS 'Backfills user_profiles and user_credits for any auth.users missing them';
