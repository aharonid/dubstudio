/*
  # Create Feedback & Review System

  1. New Tables
    - `feedback_submissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, nullable)
      - `email` (text, optional)
      - `rating` (integer, 1-5 stars)
      - `feedback_type` (text) - bug_report, feature_request, testimonial, general
      - `message` (text, required)
      - `allow_testimonial` (boolean) - permission to use as testimonial
      - `status` (text) - new, reviewed, acted_upon
      - `admin_notes` (text, nullable) - internal notes for admin
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on feedback_submissions
    - Anyone (authenticated or anonymous) can submit feedback
    - Only admin users can view all submissions
    - Only admin users can update status and admin_notes

  3. Indexes
    - Index on created_at for sorting
    - Index on rating for filtering
    - Index on feedback_type for categorization
    - Index on status for admin workflow
*/

-- Create feedback_submissions table
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug_report', 'feature_request', 'testimonial', 'general')),
  message text NOT NULL,
  allow_testimonial boolean DEFAULT false NOT NULL,
  status text DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'reviewed', 'acted_upon')),
  admin_notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on feedback_submissions
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback
CREATE POLICY "Anyone can submit feedback"
  ON feedback_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admin users can view all feedback
CREATE POLICY "Admin can view all feedback"
  ON feedback_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Only admin users can update feedback status and notes
CREATE POLICY "Admin can update feedback"
  ON feedback_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback_submissions(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_submissions(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_submissions(status);