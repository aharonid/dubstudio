/*
  # Add Clip Expiration for Non-Admin Users

  ## Overview
  This migration adds a 30-day expiration policy for clips created by regular users,
  while admin users' clips never expire.

  ## Changes Made

  1. **Add expires_at Column**
     - Re-add `expires_at` column to `dubbing_jobs` table
     - Type: `timestamptz` (timestamp with timezone)
     - Nullable (NULL means never expires)

  2. **Expiration Logic**
     - Regular users: clips expire 30 days after creation
     - Admin users (is_admin = true): clips never expire (expires_at = NULL)

  3. **Trigger Function**
     - Automatically sets expires_at on new dubbing_jobs
     - Checks if user is admin via user_profiles.is_admin
     - Sets expires_at = created_at + 30 days for non-admins
     - Sets expires_at = NULL for admins

  4. **Index**
     - Add index on expires_at for efficient cleanup queries

  ## Security Notes
  - No RLS policy changes needed
  - Existing RLS policies control job access
  - Expiration is enforced at application layer
*/

-- Add expires_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_expires_at ON dubbing_jobs(expires_at);

-- Function to set expiration based on admin status
CREATE OR REPLACE FUNCTION set_dubbing_job_expiration()
RETURNS TRIGGER AS $$
DECLARE
  user_is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT COALESCE(is_admin, false) INTO user_is_admin
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- Set expiration: NULL for admins, 30 days for regular users
  IF user_is_admin THEN
    NEW.expires_at := NULL;
  ELSE
    NEW.expires_at := NEW.created_at + INTERVAL '30 days';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set expiration
DROP TRIGGER IF EXISTS set_expiration_on_insert ON dubbing_jobs;
CREATE TRIGGER set_expiration_on_insert
  BEFORE INSERT ON dubbing_jobs
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION set_dubbing_job_expiration();

-- Backfill existing jobs (set 30 days expiration for non-admin, NULL for admin)
UPDATE dubbing_jobs dj
SET expires_at = CASE
  WHEN up.is_admin = true THEN NULL
  ELSE dj.created_at + INTERVAL '30 days'
END
FROM user_profiles up
WHERE dj.user_id = up.id
  AND dj.expires_at IS NULL;

-- For jobs without user_id (anonymous), set 30 day expiration
UPDATE dubbing_jobs
SET expires_at = created_at + INTERVAL '30 days'
WHERE user_id IS NULL
  AND expires_at IS NULL;
