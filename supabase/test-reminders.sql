-- This file lets you test the reminder functionality directly
-- Run this in the Supabase SQL Editor to test without waiting for cron

-- First, check if the function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'process_invoice_reminders'
  ) THEN
    RAISE EXCEPTION 'Function process_invoice_reminders does not exist. Run the migration first.';
  END IF;
END $$;

-- Then run the function to process any eligible invoices
SELECT public.process_invoice_reminders();

-- Verify if any reminders were sent by checking the reminders table
SELECT 
  r.id, 
  r.invoice_id, 
  r.sent_at, 
  r.status, 
  i.invoice_number,
  i.total,
  c.name as client_name,
  c.email as client_email
FROM 
  reminders r
JOIN 
  invoices i ON r.invoice_id = i.id
JOIN 
  clients c ON i.client_id = c.id
WHERE 
  r.sent_at > (NOW() - INTERVAL '10 minutes')
ORDER BY 
  r.sent_at DESC; 