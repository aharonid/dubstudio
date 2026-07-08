/*
  # Add Admin Read Policy for Dubbing Jobs

  1. Problem
    - Analytics dashboard needs to query all dubbing_jobs for conversion funnel
    - Current policies only allow users to see their own jobs
    - No admin policy exists for dubbing_jobs table

  2. Solution
    - Add SELECT policy for admins to read all dubbing jobs
    - Uses is_admin() function which checks auth.users.raw_app_meta_data

  3. Security
    - Only users with is_admin = true in auth metadata can read all jobs
    - Regular users continue to only see their own jobs
*/

-- Add admin read policy for dubbing_jobs
CREATE POLICY "Admins can read all dubbing jobs"
  ON dubbing_jobs
  FOR SELECT
  TO authenticated
  USING (is_admin());
