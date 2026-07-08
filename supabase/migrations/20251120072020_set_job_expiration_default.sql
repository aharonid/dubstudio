/*
  # Set Default Expiration for Dubbing Jobs

  1. Changes
    - Update existing jobs to set expires_at to 14 days from created_at
    - Set default for new jobs to automatically expire in 14 days
    - Add function to calculate days remaining

  2. Notes
    - All new jobs will automatically have expires_at set
    - Existing jobs without expires_at will be updated
*/

-- Update existing jobs to set expires_at (14 days from creation)
UPDATE dubbing_jobs
SET expires_at = created_at + INTERVAL '14 days'
WHERE expires_at IS NULL;

-- Set default for expires_at column
ALTER TABLE dubbing_jobs
ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '14 days');

-- Function to calculate days remaining until expiration
CREATE OR REPLACE FUNCTION days_until_expiration(expires_at timestamptz)
RETURNS integer AS $$
BEGIN
  RETURN GREATEST(0, EXTRACT(DAY FROM (expires_at - now()))::integer);
END;
$$ LANGUAGE plpgsql IMMUTABLE;