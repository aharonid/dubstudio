/*
  # Add comprehensive logging fields to dubbing_jobs table

  ## Overview
  This migration adds detailed logging and analytics fields to track the complete
  lifecycle of each dubbing job, including processing metrics, download behavior,
  and cost tracking.

  ## Changes to `dubbing_jobs` table

  ### New Processing Metrics Columns
  - `source_language` (text) - Original audio language detected or specified
  - `file_size_bytes` (bigint) - Size of the uploaded source file
  - `file_type` (text) - MIME type of source file (e.g., 'video/mp4', 'audio/mpeg')
  - `duration_seconds` (numeric) - Length of the audio/video clip
  - `num_speakers` (integer) - Number of speakers detected by ElevenLabs
  - `processing_time_seconds` (numeric) - How long ElevenLabs took to process
  - `submitted_at` (timestamptz) - When job was submitted to ElevenLabs API
  - `error_details` (jsonb) - Structured error information if job failed

  ### New Download Tracking Columns
  - `downloaded_at` (timestamptz) - First time user downloaded the result
  - `download_format` (text) - What format user downloaded: 'video', 'audio', or 'both'
  - `download_count` (integer) - Total number of downloads (all formats)
  - `preview_played` (boolean) - Whether user played preview before downloading

  ### New Cost & Analytics Columns
  - `estimated_cost_usd` (numeric) - Estimated cost based on duration and speakers
  - `elevenlabs_job_id` (text) - ElevenLabs internal job ID for reference
  - `api_version` (text) - Version of API used for future compatibility tracking

  ## Indexes
  - Add index on `source_language` for analytics queries
  - Add index on `created_at` for time-based queries
  - Add index on `downloaded_at` for engagement analytics

  ## Important Notes
  - All new fields are nullable to support existing records
  - `processing_time_seconds` calculated as difference between submitted_at and completed_at
  - `error_details` uses JSONB for flexible error structure
  - Download tracking updated from frontend when user initiates download
  - Cost estimation can be calculated based on ElevenLabs pricing model
*/

-- Add processing metrics columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'source_language'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN source_language text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN file_size_bytes bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN file_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN duration_seconds numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'num_speakers'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN num_speakers integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'processing_time_seconds'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN processing_time_seconds numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN submitted_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'error_details'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN error_details jsonb;
  END IF;
END $$;

-- Add download tracking columns
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
    WHERE table_name = 'dubbing_jobs' AND column_name = 'download_format'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN download_format text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'download_count'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN download_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'preview_played'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN preview_played boolean DEFAULT false;
  END IF;
END $$;

-- Add cost & analytics columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'estimated_cost_usd'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN estimated_cost_usd numeric(10, 4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'elevenlabs_job_id'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN elevenlabs_job_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dubbing_jobs' AND column_name = 'api_version'
  ) THEN
    ALTER TABLE dubbing_jobs ADD COLUMN api_version text DEFAULT 'v1';
  END IF;
END $$;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_source_language ON dubbing_jobs(source_language);
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_created_at ON dubbing_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_dubbing_jobs_downloaded_at ON dubbing_jobs(downloaded_at);

-- Add comment describing the table's expanded purpose
COMMENT ON TABLE dubbing_jobs IS 'Tracks ElevenLabs dubbing jobs with comprehensive logging for analytics, cost tracking, and download behavior';
