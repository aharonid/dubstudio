/*
  # Fix Duplicate User Creation Triggers

  1. Changes
    - Drop the duplicate `initialize_user_credits` function and trigger
    - Keep only `handle_new_user` which creates both profile and credits
    - Update `handle_new_user` to give 10 free credits (instead of 3)

  2. Notes
    - Fixes "Database error saving new user" caused by duplicate triggers
    - Both triggers were trying to insert into user_credits table
*/

-- Drop the duplicate trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
DROP FUNCTION IF EXISTS initialize_user_credits();

-- Update handle_new_user to give 10 credits and handle conflicts gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, completed_jobs_count)
  VALUES (new.id, new.email, 0)
  ON CONFLICT (id) DO NOTHING;

  -- Create initial credits (10 free minutes)
  INSERT INTO public.user_credits (user_id, credits_minutes, credits_used)
  VALUES (new.id, 10, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;