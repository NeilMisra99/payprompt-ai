-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT USAGE ON SCHEMA net TO postgres;

-- Allow postgres user to run cron jobs and ensure full privileges
GRANT ALL PRIVILEGES ON SCHEMA cron TO postgres;
GRANT EXECUTE ON FUNCTION cron.schedule(text, text, text) TO postgres;
GRANT EXECUTE ON FUNCTION cron.unschedule(text) TO postgres;

-- Grant pg_net access to the postgres role
-- Ensure this role has the necessary privileges if you use a different one
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;

-- First, create a helper function to process invoices that need reminders
CREATE OR REPLACE FUNCTION public.process_invoice_reminders() 
RETURNS void AS $$
DECLARE
  invoice_record RECORD;
  -- Replace with your actual deployed function URL
  -- 'http://host.docker.internal:54321/functions/v1/send-scheduled-reminders' for local dev
  function_url TEXT := (select decrypted_secret from vault.decrypted_secrets where name = 'scheduled_reminder_func_url') || '';
  -- Replace with your actual service role key
  service_key TEXT := (select decrypted_secret from vault.decrypted_secrets where name = 'service_key') || '';  
  payload JSONB;
  headers JSONB;
  response JSONB;
BEGIN
  -- Define headers, including Authorization with the service_role key
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_key
  );

  -- Select invoices meeting reminder criteria based on user profile settings
  FOR invoice_record IN
    SELECT
      i.id as invoice_id,
      c.id as client_id,
      c.email as client_email,
      c.name as client_name,
      i.invoice_number,
      i.total,
      i.due_date,
      i.user_id
    FROM public.invoices i
    JOIN public.clients c ON i.client_id = c.id
    JOIN public.profiles p ON i.user_id = p.id -- Join with profiles
    WHERE
      c.email IS NOT NULL                                   -- Ensure client has an email
      AND COALESCE((p.invoice_settings->>'auto_send_reminders')::boolean, false) = true -- Check if auto-reminders are enabled for the user
      AND i.status IN ('sent', 'overdue')                   -- Invoice is in a state where reminders make sense
      AND i.due_date IS NOT NULL                            -- Need a due date to calculate reminder dates
      AND NOT EXISTS (                                      -- Check if a reminder was sent recently (prevents duplicates if cron runs often)
        SELECT 1
        FROM public.reminders r
        WHERE r.invoice_id = i.id
          AND r.sent_at >= NOW() - INTERVAL '23 hours' -- Check within the last ~day
      )
      AND (
        -- Condition 1: Send reminder N days before the due date (for 'sent' invoices)
        ( i.status = 'sent' AND
          DATE(i.due_date - MAKE_INTERVAL(days => COALESCE((p.invoice_settings->>'reminder_days_before')::int, 3))) = DATE(NOW())
        )
        OR
        -- Condition 2: Send reminder N days after the due date (for 'overdue' invoices)
        ( i.status = 'overdue' AND
          DATE(i.due_date + MAKE_INTERVAL(days => COALESCE((p.invoice_settings->>'reminder_days_after')::int, 1))) = DATE(NOW())
        )
      )
  LOOP
    -- Construct the payload for the Edge Function
    payload := jsonb_build_object(
      'invoice_id', invoice_record.invoice_id,
      'client_id', invoice_record.client_id,
      'client_email', invoice_record.client_email,
      'client_name', invoice_record.client_name,
      'invoice_number', invoice_record.invoice_number,
      'total', invoice_record.total,
      'due_date', invoice_record.due_date,
      'user_id', invoice_record.user_id
    );

    -- Call the Edge Function via HTTP POST
    BEGIN
      SELECT * FROM net.http_post(
        url := function_url,
        body := payload,
        headers := headers,
        timeout_milliseconds := 5000 -- 5 seconds timeout
      ) INTO response;
      
      RAISE NOTICE 'Sent reminder for invoice % based on user settings', invoice_record.invoice_id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error or handle it as needed
        RAISE WARNING 'Failed to trigger reminder for invoice %: SQLSTATE=% SQLERRM=%', invoice_record.invoice_id, SQLSTATE, SQLERRM;
    END;

    -- Optional: Add a small delay between function calls if needed
    -- PERFORM pg_sleep(0.1); 
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Remove any existing job with the same name (optional, good for idempotency)
DO $$
BEGIN
  PERFORM cron.unschedule('send-daily-reminders');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No existing job to unschedule';
END
$$;

-- Schedule the job to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'send-daily-reminders',        -- Name of the cron job
  '0 3 * * *',                   -- Cron schedule: At 03:00 every day
  'SELECT public.process_invoice_reminders();'  -- Simple function call
);

-- Verify job was created
DO $$
DECLARE
  job_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'send-daily-reminders') INTO job_exists;
  IF job_exists THEN
    RAISE NOTICE 'Job "send-daily-reminders" was created successfully';
  ELSE
    RAISE WARNING 'Failed to create job "send-daily-reminders"';
  END IF;
END
$$;

-- Optional: Grant permission for authenticated users to see job history if needed
-- GRANT SELECT ON ALL TABLES IN SCHEMA cron TO authenticated; 