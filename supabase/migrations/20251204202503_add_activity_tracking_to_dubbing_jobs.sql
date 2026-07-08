/*
  # Add Activity Tracking to Dubbing Jobs

  1. Changes
    - Add `downloaded_at` (timestamptz) - tracks when user downloaded the dubbed audio
    - Add `abandoned_at` (timestamptz) - tracks when user left before completion
    - Add `shared_at` (timestamptz) - tracks when user created a share link
    - Add `last_viewed_at` (timestamptz) - tracks last time user checked the job status

  2. Purpose
    - Enable comprehensive user activity tracking
    - Identify abandonment patterns
    - Measure engagement (downloads, shares)
    - Understand user behavior flow
*/

-- Add activity tracking columns to dubbing_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'downloaded_at'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN downloaded_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'abandoned_at'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN abandoned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'shared_at'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN shared_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'last_viewed_at'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN last_viewed_at timestamptz;
  END IF;
END $$;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_downloaded_at ON dubbing_jobs(downloaded_at) WHERE downloaded_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_abandoned_at ON dubbing_jobs(abandoned_at) WHERE abandoned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_shared_at ON dubbing_jobs(shared_at) WHERE shared_at IS NOT NULL;