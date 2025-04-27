-- Test script for reminder function
-- This focuses specifically on testing the reminder function with test data
-- seeded by `supabase/seed.sql`.

-- 1. Show which invoices should get reminders based on seeded data
-- These are the ones we expect the reminder function to find and process
SELECT 
  i.id as invoice_id,
  i.invoice_number,
  i.status,
  i.due_date,
  i.total,
  c.name as client_name,
  c.email as client_email,
  (SELECT MAX(r.sent_at) FROM reminders r WHERE r.invoice_id = i.id) as last_reminder_sent
FROM 
  invoices i
JOIN 
  clients c ON i.client_id = c.id
WHERE
  i.status IN ('sent', 'overdue')
  AND c.email IS NOT NULL
  AND NOT EXISTS (
    -- Check if a reminder was sent in the last 3 days
    SELECT 1
    FROM reminders r
    WHERE r.invoice_id = i.id
      AND r.sent_at >= NOW() - INTERVAL '3 days'
  )
ORDER BY
  i.due_date;

-- 2. Run the reminder function
-- Ensure `supabase/seed.sql` has been run first to provide test data.
DO $$
BEGIN
  RAISE NOTICE 'Executing reminder processing function...';
  PERFORM public.process_invoice_reminders();
  RAISE NOTICE 'Finished executing reminder processing function.';
END $$;

-- 3. Check for reminders created in the last few minutes
SELECT 
  r.id, 
  r.invoice_id, 
  r.sent_at, 
  r.type,
  r.status, 
  i.invoice_number,
  i.total,
  c.name as client_name,
  c.email as client_email,
  LEFT(r.message, 50) || '...' as message_excerpt
FROM 
  reminders r
JOIN 
  invoices i ON r.invoice_id = i.id
JOIN 
  clients c ON i.client_id = c.id
WHERE 
  r.sent_at > (NOW() - INTERVAL '5 minutes')
ORDER BY 
  r.sent_at DESC;

-- 4. Check which Test invoices received reminders vs. which should have been excluded
SELECT 
  i.id as invoice_id,
  i.invoice_number,
  i.status,
  i.due_date,
  (
    SELECT COUNT(*) FROM reminders r 
    WHERE r.invoice_id = i.id AND r.sent_at > (NOW() - INTERVAL '5 minutes')
  ) as reminders_just_sent,
  (
    SELECT MAX(r.sent_at) FROM reminders r WHERE r.invoice_id = i.id
  ) as last_reminder_time
FROM 
  invoices i
WHERE 
  i.invoice_number LIKE 'TEST-%'
ORDER BY 
  i.invoice_number; 