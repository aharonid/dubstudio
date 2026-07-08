/*
  # Create dubbing_jobs table for async video/audio dubbing

  ## Overview
  This migration creates a table to track ElevenLabs dubbing jobs asynchronously,
  allowing the edge function to return immediately instead of waiting for completion.

  ## New Tables
  
  ### `dubbing_jobs`
  Stores the state and metadata of each dubbing job submitted to ElevenLabs.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the job record
  - `dubbing_id` (text, unique, not null) - ElevenLabs dubbing job ID
  - `user_id` (uuid, nullable) - User who submitted the job (for authenticated users)
  - `session_id` (text, nullable) - Anonymous session ID (for unauthenticated users)
  - `status` (text, not null) - Current job status: 'pending', 'processing', 'completed', 'failed'
  - `target_language` (text, not null) - Target language code (e.g., 'es', 'fr', 'de')
  - `source_filename` (text, not null) - Original uploaded filename
  - `audio_url` (text, nullable) - Direct URL to dubbed audio from ElevenLabs (set when completed)
  - `error_message` (text, nullable) - Error details if job failed
  - `created_at` (timestamptz) - When job was created
  - `updated_at` (timestamptz) - When job status was last updated
  - `completed_at` (timestamptz, nullable) - When job finished (success or failure)

  ## Security
  
  ### Row Level Security (RLS)
  - **Enabled**: Yes, table is fully locked down by default
  
  ### Policies
  1. **"Users can view own jobs"** - SELECT policy
     - Authenticated users can see jobs where user_id matches their auth.uid()
     - Anonymous users can see jobs where session_id matches their session
  
  2. **"Users can insert own jobs"** - INSERT policy
     - Authenticated users can create jobs with their user_id
     - Anonymous users can create jobs with their session_id
  
  3. **"Service can update any job"** - UPDATE policy
     - Only the service role can update job status (for webhook)
     - Regular users cannot modify jobs
  
  4. **"Users can delete own jobs"** - DELETE policy
     - Users can delete their own jobs for cleanup
  
  ## Important Notes
  - Jobs are accessible by either user_id (authenticated) OR session_id (anonymous)
  - The webhook endpoint will use service role key to update job status
  - Audio URLs from ElevenLabs are time-limited, so download promptly
  - Consider adding a cleanup job to delete old completed jobs after 24-48 hours
*/

-- Create dubbing_jobs table
CREATE TABLE IF NOT EXISTS dubbing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dubbing_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  target_language text NOT NULL,
  source_filename text NOT NULL,
  audio_url text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT has_identifier CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE dubbing_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own jobs
CREATE POLICY "Users can view own jobs"
  ON dubbing_jobs
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR 
    (session_id IS NOT NULL AND session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );

-- Policy: Users can insert their own jobs
CREATE POLICY "Users can insert own jobs"
  ON dubbing_jobs
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR 
    (session_id IS NOT NULL)
  );

-- Policy: Only service role can update jobs (for webhook)
CREATE POLICY "Service can update any job"
  ON dubbing_jobs
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Policy: Users can delete their own jobs
CREATE POLICY "Users can delete own jobs"
  ON dubbing_jobs
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR 
    (session_id IS NOT NULL AND session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );

-- Create index on dubbing_id for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_dubbing_id ON dubbing_jobs(dubbing_id);

-- Create index on status for filtering active jobs
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_status ON dubbing_jobs(status);

-- Create index on user_id for user job queries
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_user_id ON dubbing_jobs(user_id);

-- Create index on session_id for anonymous user queries
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_session_id ON dubbing_jobs(session_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dubbing_jobs_updated_at
  BEFORE UPDATE ON dubbing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();