/*
  # Create Login History Tracking

  1. New Tables
    - `login_history`
      - `id` (uuid, primary key) - unique identifier for each login event
      - `user_id` (uuid, foreign key) - reference to auth.users
      - `logged_in_at` (timestamptz) - when the login occurred
      - `ip_address` (text) - IP address of the login
      - `user_agent` (text) - browser/device information
      - `login_method` (text) - authentication method used (email/password)
      - `success` (boolean) - whether login was successful
      - `created_at` (timestamptz) - record creation timestamp

  2. Security
    - Enable RLS on `login_history` table
    - Add policy for admins to read all login history
    - Add policy for users to read their own login history

  3. Indexes
    - Index on user_id for fast lookups
    - Index on logged_in_at for time-based queries
*/

-- Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  login_method text DEFAULT 'email/password',
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Admins can read all login history
CREATE POLICY "Admins can read all login history"
  ON login_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Users can read their own login history
CREATE POLICY "Users can read own login history"
  ON login_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_logged_in_at ON login_history(logged_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_time ON login_history(user_id, logged_in_at DESC);