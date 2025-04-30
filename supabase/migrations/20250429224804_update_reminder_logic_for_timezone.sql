-- Recreate the function with updated logic using due_at for timezone awareness
CREATE OR REPLACE FUNCTION public.process_invoice_reminders()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  invoice_record RECORD;
  -- Replace with your actual deployed function URL or env var
  function_url TEXT := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduled_reminder_func_url') || '';
  -- Replace with your actual service role key or env var
  service_key TEXT := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key') || '';
  payload JSONB;
  headers JSONB;
  response JSONB;
BEGIN
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_key
  );

  FOR invoice_record IN
    SELECT
      i.id as invoice_id,
      c.id as client_id,
      c.email as client_email,
      c.name as client_name,
      i.invoice_number,
      i.total,
      i.due_date, -- Keep for payload compatibility, though due_at is used for logic
      i.due_at,   -- Fetch the precise due timestamp
      i.user_id,
      p.company_name
    FROM public.invoices i
    JOIN public.clients c ON i.client_id = c.id
    JOIN public.profiles p ON i.user_id = p.id
    WHERE
      c.email IS NOT NULL
      AND COALESCE((p.invoice_settings->>'auto_send_reminders')::boolean, false) = true
      AND i.status IN ('sent', 'overdue')
      AND i.due_at IS NOT NULL -- Use the precise due_at timestamp for logic
      AND NOT EXISTS (
        SELECT 1
        FROM public.reminders r
        WHERE r.invoice_id = i.id
          AND r.sent_at >= NOW() - INTERVAL '23 hours'
      )
      AND (
        -- Condition 1: Upcoming reminder N days before due_at (compare truncated dates)
        ( i.status = 'sent' AND
          date_trunc('day', i.due_at - make_interval(days => COALESCE((p.invoice_settings->>'reminder_days_before')::int, 3)))
          = date_trunc('day', NOW())
        )
        OR
        -- Condition 2: Overdue reminder N days after due_at (compare truncated dates)
        ( i.status = 'overdue' AND
          date_trunc('day', i.due_at + make_interval(days => COALESCE((p.invoice_settings->>'reminder_days_after')::int, 1)))
          = date_trunc('day', NOW())
        )
      )
  LOOP
    payload := jsonb_build_object(
      'invoice_id', invoice_record.invoice_id,
      'client_id', invoice_record.client_id,
      'client_email', invoice_record.client_email,
      'client_name', invoice_record.client_name,
      'invoice_number', invoice_record.invoice_number,
      'total', invoice_record.total,
      'due_date', invoice_record.due_date, -- Keep original due_date string in payload
      'due_at', invoice_record.due_at,     -- Include precise due_at timestamp in payload
      'user_id', invoice_record.user_id,
      'company_name', invoice_record.company_name
    );

    BEGIN
      SELECT * FROM net.http_post(
        url := function_url,
        body := payload,
        headers := headers,
        timeout_milliseconds := 5000
      ) INTO response;

      RAISE NOTICE 'Sent reminder for invoice % (Due At: %)', invoice_record.invoice_id, invoice_record.due_at;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger reminder for invoice %: SQLSTATE=% SQLERRM=%', invoice_record.invoice_id, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END;
$$;
