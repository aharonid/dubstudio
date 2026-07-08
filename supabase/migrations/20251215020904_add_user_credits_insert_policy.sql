/*
  # Add INSERT Policy for user_credits Table

  1. Problem
    - The handle_new_user trigger function cannot insert into user_credits
    - RLS is enabled but there's no INSERT policy
    - This causes signup to fail with "Database error saving new user"

  2. Solution
    - Add INSERT policy allowing users to insert their own credits record
    - The trigger function uses SECURITY DEFINER but still needs RLS permission
*/

-- Add INSERT policy for user_credits
CREATE POLICY "Users can insert own credits"
  ON public.user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also add a policy for service role / trigger functions
-- Since the trigger runs before the user is fully authenticated,
-- we need to allow the insert from the trigger context
CREATE POLICY "Service role can insert credits"
  ON public.user_credits
  FOR INSERT
  TO service_role
  WITH CHECK (true);