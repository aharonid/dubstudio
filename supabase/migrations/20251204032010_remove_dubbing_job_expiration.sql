/*
  # Remove Dubbing Job Expiration

  1. Changes
    - Remove expires_at column
    - Clips never expire, stored permanently
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE dubbing_jobs DROP COLUMN expires_at;
  END IF;
END $$;
