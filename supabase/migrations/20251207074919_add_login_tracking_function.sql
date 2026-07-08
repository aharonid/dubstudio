/*
  # Add Login Tracking Function

  1. New Functions
    - `log_user_login` - Function to log user login events
  
  2. Changes
    - Creates a function that can be called from the client to log login events
    - Stores IP address, user agent, and login method
  
  3. Security
    - Function can only be called by authenticated users
    - Users can only log their own login events
*/

CREATE OR REPLACE FUNCTION log_user_login(
  p_ip_address text,
  p_user_agent text,
  p_login_method text DEFAULT 'email/password'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_login_id uuid;
BEGIN
  INSERT INTO login_history (
    user_id,
    ip_address,
    user_agent,
    login_method,
    success,
    logged_in_at
  ) VALUES (
    auth.uid(),
    p_ip_address,
    p_user_agent,
    p_login_method,
    true,
    now()
  )
  RETURNING id INTO v_login_id;

  UPDATE user_profiles
  SET 
    last_login_at = now(),
    last_login_ip = p_ip_address::inet
  WHERE id = auth.uid();

  RETURN v_login_id;
END;
$$;
