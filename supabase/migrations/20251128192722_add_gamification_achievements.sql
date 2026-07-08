/*
  # Add Gamification and Achievement System

  1. New Tables
    - `achievements`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., "Bronze Creator"
      - `description` (text)
      - `milestone_count` (integer) - Videos needed to unlock
      - `reward_credits` (integer) - Free minutes awarded
      - `badge_icon` (text) - Emoji or icon identifier
      - `order` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `achievement_id` (uuid, references achievements)
      - `unlocked_at` (timestamptz)
      - `credits_awarded` (integer)
      - `created_at` (timestamptz)

  2. New Columns
    - Add `completed_jobs_count` to user_profiles to track total completed dubs

  3. Security
    - Enable RLS on all tables
    - Users can read all achievements
    - Users can only view their own unlocked achievements

  4. Seed Data
    - Insert default achievement milestones
*/

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  milestone_count integer NOT NULL,
  reward_credits integer NOT NULL,
  badge_icon text NOT NULL,
  display_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  credits_awarded integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Add completed_jobs_count to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'completed_jobs_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN completed_jobs_count integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (public read)
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievements_milestone_count ON achievements(milestone_count);

-- Insert default achievements
INSERT INTO achievements (name, description, milestone_count, reward_credits, badge_icon, display_order)
VALUES
  ('Bronze Creator', 'Complete your first 10 videos', 10, 5, '🥉', 1),
  ('Silver Creator', 'Reach 100 dubbed videos', 100, 10, '🥈', 2),
  ('Gold Creator', 'Hit the 1,000 video milestone', 1000, 30, '🥇', 3),
  ('Diamond Creator', 'Master level: 10,000 videos dubbed', 10000, 100, '💎', 4)
ON CONFLICT DO NOTHING;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements()
RETURNS TRIGGER AS $$
DECLARE
  achievement_record RECORD;
  user_jobs_count integer;
BEGIN
  -- Only process completed jobs
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get current completed jobs count for user
    SELECT COALESCE(completed_jobs_count, 0) INTO user_jobs_count
    FROM user_profiles
    WHERE id = NEW.user_id;

    -- Increment completed jobs count
    user_jobs_count := user_jobs_count + 1;

    -- Update user profile
    UPDATE user_profiles
    SET 
      completed_jobs_count = user_jobs_count,
      updated_at = now()
    WHERE id = NEW.user_id;

    -- Check for new achievements
    FOR achievement_record IN
      SELECT a.*
      FROM achievements a
      WHERE a.milestone_count <= user_jobs_count
      AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.user_id = NEW.user_id
        AND ua.achievement_id = a.id
      )
      ORDER BY a.milestone_count ASC
    LOOP
      -- Award achievement
      INSERT INTO user_achievements (user_id, achievement_id, credits_awarded)
      VALUES (NEW.user_id, achievement_record.id, achievement_record.reward_credits);

      -- Add credits to user account
      UPDATE user_credits
      SET 
        credits_minutes = credits_minutes + achievement_record.reward_credits,
        updated_at = now()
      WHERE user_id = NEW.user_id;

      -- Log the credit transaction
      INSERT INTO credit_transactions (user_id, dubbing_job_id, credits_used, balance_before, balance_after)
      SELECT 
        NEW.user_id,
        NULL,
        -achievement_record.reward_credits,
        credits_minutes - achievement_record.reward_credits,
        credits_minutes
      FROM user_credits
      WHERE user_id = NEW.user_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-award achievements when jobs complete
DROP TRIGGER IF EXISTS on_job_completed_check_achievements ON dubbing_jobs;
CREATE TRIGGER on_job_completed_check_achievements
  AFTER INSERT OR UPDATE ON dubbing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_achievements();