/*
  # Create Quiz Responses Table

  1. New Tables
    - `quiz_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `content_type` (text) - Type of content they create
      - `channel_size` (text) - Size of their channel
      - `primary_audience_location` (text) - Where their audience is
      - `goals` (text) - What they want to achieve
      - `content_topic` (text) - Topic of their content
      - `current_language` (text) - Current content language
      - `recommended_languages` (jsonb) - Array of 3 recommended languages with reasons
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `quiz_responses` table
    - Users can insert their own responses
    - Users can view their own responses
    - Admin-only policy for viewing all responses (to be set up separately)
*/

CREATE TABLE IF NOT EXISTS quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL,
  channel_size text NOT NULL,
  primary_audience_location text NOT NULL,
  goals text NOT NULL,
  content_topic text NOT NULL,
  current_language text NOT NULL,
  recommended_languages jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own quiz responses"
  ON quiz_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own quiz responses"
  ON quiz_responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_created_at ON quiz_responses(created_at DESC);