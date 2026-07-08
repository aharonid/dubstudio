/*
  # Add duration_minutes column to dubbing_jobs table

  1. Changes
    - Add `duration_minutes` column to `dubbing_jobs` table to store the video duration in minutes
    - This is used for accurate credit billing based on frontend-calculated duration
    - Defaults to 1 minute for safety

  2. Notes
    - This column is populated when the job is created
    - The webhook uses this stored value instead of recalculating from API response
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN duration_minutes integer DEFAULT 1;
  END IF;
END $$;
