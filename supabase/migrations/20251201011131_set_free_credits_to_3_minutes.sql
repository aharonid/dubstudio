/*
  # Set Free Credits to 3 Minutes

  1. Changes
    - Update handle_new_user function to give 3 free minutes (not 10)
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, completed_jobs_count)
  VALUES (new.id, new.email, 0)
  ON CONFLICT (id) DO NOTHING;

  -- Create initial credits (3 free minutes)
  INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
  VALUES (new.id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;