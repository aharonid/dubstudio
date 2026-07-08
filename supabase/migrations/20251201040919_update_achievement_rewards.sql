/*
  # Update Achievement Rewards

  1. Changes
    - Bronze: 20 videos → 1 credit reward
    - Silver: 100 videos → 5 credit reward
    - Gold: 1000 videos → 50 credit reward
    - Diamond: 10000 videos → 500 credit reward

  2. Notes
    - Updates existing achievement tiers with new milestones and rewards
*/

UPDATE achievements
SET 
  milestone_count = 20,
  reward_credits = 1,
  description = 'Complete your first 20 videos'
WHERE name = 'Bronze Creator';

UPDATE achievements
SET 
  milestone_count = 100,
  reward_credits = 5,
  description = 'Reach 100 dubbed videos'
WHERE name = 'Silver Creator';

UPDATE achievements
SET 
  milestone_count = 1000,
  reward_credits = 50,
  description = 'Hit the 1,000 video milestone'
WHERE name = 'Gold Creator';

UPDATE achievements
SET 
  milestone_count = 10000,
  reward_credits = 500,
  description = 'Master level: 10,000 videos dubbed'
WHERE name = 'Diamond Creator';
