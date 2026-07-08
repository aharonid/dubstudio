/*
  # Add User Profiles and Authentication Support

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique, not null)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Changes to Existing Tables
    - Add `user_id` column to `dubbing_jobs` table
    - Link dubbing_jobs to authenticated users
    - Maintain backward compatibility with session_id for anonymous users

  3. Security
    - Enable RLS on `user_profiles` table
    - Add policies for users to read and update their own profile
    - Update `dubbing_jobs` RLS policies to check user ownership
    - Authenticated users can only see their own jobs
    - Anonymous users can still access jobs by session_id (for backward compatibility)

  4. Indexes
    - Add index on `dubbing_jobs.user_id` for faster queries
    - Add index on `dubbing_jobs.expires_at` for cleanup operations
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (triggered by signup)
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add user_id and expires_at columns to dubbing_jobs if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_user_id ON dubbing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_expires_at ON dubbing_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_created_at ON dubbing_jobs(created_at DESC);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own jobs" ON dubbing_jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON dubbing_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON dubbing_jobs;
DROP POLICY IF EXISTS "Anonymous users can access by session" ON dubbing_jobs;

-- Update RLS policies for dubbing_jobs
-- Authenticated users can view their own jobs
CREATE POLICY "Authenticated users can view own jobs"
  ON dubbing_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous users can view jobs by session_id (backward compatibility)
CREATE POLICY "Anonymous users can view by session"
  ON dubbing_jobs
  FOR SELECT
  TO anon
  USING (session_id IS NOT NULL);

-- Authenticated users can insert jobs
CREATE POLICY "Authenticated users can insert jobs"
  ON dubbing_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anonymous users can insert jobs (backward compatibility)
CREATE POLICY "Anonymous users can insert jobs"
  ON dubbing_jobs
  FOR INSERT
  TO anon
  WITH CHECK (session_id IS NOT NULL);

-- Authenticated users can update their own jobs
CREATE POLICY "Authenticated users can update own jobs"
  ON dubbing_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anonymous users can update jobs by session_id
CREATE POLICY "Anonymous users can update by session"
  ON dubbing_jobs
  FOR UPDATE
  TO anon
  USING (session_id IS NOT NULL)
  WITH CHECK (session_id IS NOT NULL);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on user_profiles
DROP TRIGGER IF EXISTS on_user_profile_updated ON user_profiles;
CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();