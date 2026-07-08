/*
  # Add Language Diversity Achievements

  1. New Achievements
    - `Trilingual` - Dub in 3 different languages
      - Reward: 3 credits
      - Badge: 🌍
    - `International Creator` - Dub in 10 different languages
      - Reward: 15 credits
      - Badge: 🌎

  2. Implementation Details
    - These achievements are based on unique language count, not total video count
    - Will require manual claiming via the claim-reward edge function
    - Tracking is done by querying COUNT(DISTINCT target_language) from dubbing_jobs

  3. Notes
    - Using negative milestone_count values to distinguish from video-count achievements
    - milestone_count will store the negative of required languages (e.g., -3 for 3 languages)
    - This allows the existing achievements table structure to work for both types
*/

-- Insert language diversity achievements
INSERT INTO achievements (name, description, milestone_count, reward_credits, badge_icon, display_order)
VALUES
  ('Trilingual', 'Dub content in 3 different languages', -3, 3, '🌍', 5),
  ('International Creator', 'Master 10 different languages', -10, 15, '🌎', 6)
ON CONFLICT DO NOTHING;
