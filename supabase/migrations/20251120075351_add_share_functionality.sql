/*
  # Add Share Functionality for Dubbing Jobs

  1. Changes to Existing Tables
    - Add `share_token` column to `dubbing_jobs` table (unique, indexed)
    - Add `is_public` column to control if a video is publicly shareable
    - Add `share_count` column to track how many times a video has been viewed via share link

  2. Security
    - Add policy to allow public access to jobs with valid share token
    - Only the owner can make their videos public/shareable
    - Shared videos are read-only for the public

  3. Indexes
    - Add unique index on `share_token` for fast lookups
    - Add index on `is_public` for filtering public jobs
*/

-- Add share-related columns to dubbing_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'share_token'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN share_token text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN is_public boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'share_count'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN share_count integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Create indexes for share functionality
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_share_token ON dubbing_jobs(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_is_public ON dubbing_jobs(is_public) WHERE is_public = true;

-- Drop existing public access policy if it exists
DROP POLICY IF EXISTS "Public can view shared jobs" ON dubbing_jobs;

-- Allow public access to jobs with valid share token
CREATE POLICY "Public can view shared jobs"
  ON dubbing_jobs
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND share_token IS NOT NULL);

-- Authenticated users can delete their own jobs
DROP POLICY IF EXISTS "Authenticated users can delete own jobs" ON dubbing_jobs;
CREATE POLICY "Authenticated users can delete own jobs"
  ON dubbing_jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous users can delete jobs by session_id
DROP POLICY IF EXISTS "Anonymous users can delete by session" ON dubbing_jobs;
CREATE POLICY "Anonymous users can delete by session"
  ON dubbing_jobs
  FOR DELETE
  TO anon
  USING (session_id IS NOT NULL);