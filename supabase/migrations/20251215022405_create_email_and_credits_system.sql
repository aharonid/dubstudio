/*
  # Email Campaign and Credits Tracking System

  1. New Tables
    - `email_campaigns` - Track bulk email sends
    - `email_logs` - Track individual email sends
    - `elevenlabs_credits` - Track Eleven Labs API usage and credits

  2. Security
    - Enable RLS on all tables
    - Only admins can create/read campaigns
    - Only service role can insert logs
*/

-- Create email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  subject text NOT NULL,
  body text NOT NULL,
  recipient_type text NOT NULL, -- 'all_users', 'test'
  status text DEFAULT 'draft', -- draft, scheduled, sending, completed, failed
  recipients_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  test_recipient_email text, -- for test emails
  created_at timestamptz DEFAULT now(),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'pending', -- pending, sent, failed
  error_message text,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Create Eleven Labs credits table
CREATE TABLE IF NOT EXISTS public.elevenlabs_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_hash text UNIQUE NOT NULL,
  current_balance_cents integer DEFAULT 0,
  last_updated_at timestamptz DEFAULT now(),
  last_check_at timestamptz,
  low_credit_alert_sent boolean DEFAULT false,
  zero_credit_alert_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elevenlabs_credits ENABLE ROW LEVEL SECURITY;

-- Email campaigns policies
CREATE POLICY "Admins can manage email campaigns"
  ON public.email_campaigns
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin() AND admin_user_id = auth.uid());

CREATE POLICY "Service role can read campaigns"
  ON public.email_campaigns
  FOR SELECT
  TO service_role
  USING (true);

-- Email logs policies
CREATE POLICY "Admins can read email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can write email logs"
  ON public.email_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Elevenlabs credits policies
CREATE POLICY "Admins can read credits"
  ON public.elevenlabs_credits
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can manage credits"
  ON public.elevenlabs_credits
  FOR ALL
  TO service_role
  USING (true);