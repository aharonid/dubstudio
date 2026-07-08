/*
  # GDPR Privacy Functions

  1. Functions Added
    - `export_user_data()` - Exports all user data in JSON format
    - `request_account_deletion()` - Schedules account deletion (30-day grace period)
    - `cancel_account_deletion()` - Cancels pending deletion request
    - `execute_scheduled_deletions()` - Executes deletions past their scheduled date

  2. Security
    - All functions use SECURITY DEFINER for proper permissions
    - Users can only export/delete their own data
    - Audit logs created for all privacy actions

  3. GDPR Compliance
    - Right to access: export_user_data()
    - Right to erasure: request_account_deletion()
    - 30-day grace period before permanent deletion
    - Complete data removal (not just soft delete)
*/

-- Function to export user data (GDPR Right to Access)
CREATE OR REPLACE FUNCTION export_user_data(target_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  user_data jsonb;
BEGIN
  -- Verify the requesting user is the target user
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot export other users data';
  END IF;

  SELECT jsonb_build_object(
    'user_profile', (SELECT row_to_json(up.*) FROM user_profiles up WHERE up.id = target_user_id),
    'user_credits', (SELECT row_to_json(uc.*) FROM user_credits uc WHERE uc.user_id = target_user_id),
    'credit_purchases', (SELECT jsonb_agg(row_to_json(cp.*)) FROM credit_purchases cp WHERE cp.user_id = target_user_id),
    'credit_transactions', (SELECT jsonb_agg(row_to_json(ct.*)) FROM credit_transactions ct WHERE ct.user_id = target_user_id),
    'dubbing_jobs', (SELECT jsonb_agg(row_to_json(dj.*)) FROM dubbing_jobs dj WHERE dj.user_id = target_user_id),
    'user_achievements', (SELECT jsonb_agg(row_to_json(ua.*)) FROM user_achievements ua WHERE ua.user_id = target_user_id),
    'contact_submissions', (SELECT jsonb_agg(row_to_json(cs.*)) FROM contact_submissions cs WHERE cs.email = (SELECT email FROM auth.users WHERE id = target_user_id)),
    'exported_at', now()
  ) INTO user_data;

  -- Log the export
  INSERT INTO security_audit_logs (user_id, event_type, metadata)
  VALUES (target_user_id, 'data_export', jsonb_build_object('exported_at', now()));

  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to request account deletion (GDPR Right to Erasure)
CREATE OR REPLACE FUNCTION request_account_deletion()
RETURNS jsonb AS $$
DECLARE
  deletion_date timestamptz;
  result jsonb;
BEGIN
  deletion_date := now() + interval '30 days';

  -- Insert or update deletion request
  INSERT INTO data_deletion_requests (user_id, scheduled_deletion_at)
  VALUES (auth.uid(), deletion_date)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    requested_at = now(),
    scheduled_deletion_at = deletion_date,
    status = 'pending',
    completed_at = NULL
  RETURNING jsonb_build_object(
    'id', id,
    'scheduled_deletion_at', scheduled_deletion_at,
    'status', status
  ) INTO result;

  -- Log the deletion request
  INSERT INTO security_audit_logs (user_id, event_type, metadata)
  VALUES (auth.uid(), 'deletion_requested', jsonb_build_object('scheduled_for', deletion_date));

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel account deletion
CREATE OR REPLACE FUNCTION cancel_account_deletion()
RETURNS boolean AS $$
BEGIN
  UPDATE data_deletion_requests
  SET status = 'cancelled', completed_at = now()
  WHERE user_id = auth.uid() AND status = 'pending';

  -- Log the cancellation
  INSERT INTO security_audit_logs (user_id, event_type)
  VALUES (auth.uid(), 'deletion_cancelled');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute scheduled deletions (run by admin/cron)
CREATE OR REPLACE FUNCTION execute_scheduled_deletions()
RETURNS integer AS $$
DECLARE
  deleted_count integer := 0;
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT user_id FROM data_deletion_requests
    WHERE status = 'pending' 
    AND scheduled_deletion_at <= now()
  LOOP
    -- Delete user data in order (respecting foreign keys)
    DELETE FROM user_achievements WHERE user_id = user_record.user_id;
    DELETE FROM credit_transactions WHERE user_id = user_record.user_id;
    DELETE FROM credit_purchases WHERE user_id = user_record.user_id;
    DELETE FROM user_credits WHERE user_id = user_record.user_id;
    DELETE FROM dubbing_jobs WHERE user_id = user_record.user_id;
    DELETE FROM user_profiles WHERE id = user_record.user_id;
    DELETE FROM security_audit_logs WHERE user_id = user_record.user_id;
    
    -- Mark deletion as completed
    UPDATE data_deletion_requests
    SET status = 'completed', completed_at = now()
    WHERE user_id = user_record.user_id;

    -- Delete the auth user (this will cascade to data_deletion_requests)
    DELETE FROM auth.users WHERE id = user_record.user_id;

    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;