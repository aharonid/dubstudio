/*
  # Fix Share Token Column Type

  1. Changes
    - Convert `share_token` from UUID to TEXT to support custom token formats
    - This allows us to use human-readable share tokens instead of UUIDs
    - Drop and recreate policies that depend on share_token
*/

-- Drop policies that depend on share_token
DROP POLICY IF EXISTS "Allow public access to shared clips" ON dubbing_jobs;
DROP POLICY IF EXISTS "Public can view shared jobs" ON dubbing_jobs;

-- Drop the existing constraint if it exists
ALTER TABLE dubbing_jobs DROP CONSTRAINT IF EXISTS dubbing_jobs_share_token_key;

-- Change share_token from uuid to text
ALTER TABLE dubbing_jobs ALTER COLUMN share_token TYPE text USING share_token::text;

-- Re-add the unique constraint
ALTER TABLE dubbing_jobs ADD CONSTRAINT dubbing_jobs_share_token_key UNIQUE (share_token);

-- Recreate the public access policy
CREATE POLICY "Public can view shared jobs"
  ON dubbing_jobs
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND share_token IS NOT NULL);