/*
  # Create Language Milestones System

  1. New Tables
    - `language_milestones` - Tracks when users hit 1st and 1000th dub per language
    
  2. Changes
    - Track language-specific achievements
    - Reward: 1st dub = 1 credit, 1000th dub = 50 credits
    
  3. Security
    - RLS enabled
    - Users can only read their own milestones
*/

-- Create language milestones table
CREATE TABLE IF NOT EXISTS language_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  milestone_type text NOT NULL CHECK (milestone_type IN ('first_dub', 'thousandth_dub')),
  credits_awarded integer NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, language_code, milestone_type)
);

ALTER TABLE language_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own language milestones"
  ON language_milestones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_language_milestones_user ON language_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_language_milestones_language ON language_milestones(language_code);

-- Function to check and award language milestones
CREATE OR REPLACE FUNCTION check_language_milestones()
RETURNS trigger AS $$
DECLARE
  lang_count integer;
  first_milestone_exists boolean;
  thousandth_milestone_exists boolean;
  current_credits integer;
BEGIN
  -- Only process completed jobs with a user_id
  IF NEW.status = 'completed' AND NEW.user_id IS NOT NULL THEN
    
    -- Count completed jobs for this user and language
    SELECT COUNT(*) INTO lang_count
    FROM dubbing_jobs
    WHERE user_id = NEW.user_id 
      AND target_language = NEW.target_language
      AND status = 'completed';
    
    -- Check if first milestone already exists
    SELECT EXISTS(
      SELECT 1 FROM language_milestones
      WHERE user_id = NEW.user_id
        AND language_code = NEW.target_language
        AND milestone_type = 'first_dub'
    ) INTO first_milestone_exists;
    
    -- Check if thousandth milestone already exists
    SELECT EXISTS(
      SELECT 1 FROM language_milestones
      WHERE user_id = NEW.user_id
        AND language_code = NEW.target_language
        AND milestone_type = 'thousandth_dub'
    ) INTO thousandth_milestone_exists;
    
    -- Award first dub milestone (1 credit)
    IF lang_count = 1 AND NOT first_milestone_exists THEN
      -- Insert milestone record
      INSERT INTO language_milestones (user_id, language_code, milestone_type, credits_awarded)
      VALUES (NEW.user_id, NEW.target_language, 'first_dub', 1)
      ON CONFLICT (user_id, language_code, milestone_type) DO NOTHING;
      
      -- Award credits
      UPDATE user_credits
      SET credits_minutes = credits_minutes + 1,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Award 1000th dub milestone (50 credits)
    IF lang_count = 1000 AND NOT thousandth_milestone_exists THEN
      -- Insert milestone record
      INSERT INTO language_milestones (user_id, language_code, milestone_type, credits_awarded)
      VALUES (NEW.user_id, NEW.target_language, 'thousandth_dub', 50)
      ON CONFLICT (user_id, language_code, milestone_type) DO NOTHING;
      
      -- Award credits
      UPDATE user_credits
      SET credits_minutes = credits_minutes + 50,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check milestones after job completion
DROP TRIGGER IF EXISTS trigger_check_language_milestones ON dubbing_jobs;
CREATE TRIGGER trigger_check_language_milestones
  AFTER INSERT OR UPDATE OF status ON dubbing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION check_language_milestones();

COMMENT ON TABLE language_milestones IS 'Tracks language-specific milestones: 1st dub (1 credit) and 1000th dub (50 credits)';
COMMENT ON FUNCTION check_language_milestones IS 'Awards credits when user completes 1st or 1000th dub in a language';
