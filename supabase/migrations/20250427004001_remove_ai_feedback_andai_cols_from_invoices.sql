-- Drop the AI feedback table
DROP TABLE IF EXISTS public.ai_invoice_feedback;

-- Drop the AI related columns from the invoices table
ALTER TABLE public.invoices
DROP COLUMN IF EXISTS generated_by_ai,
DROP COLUMN IF EXISTS ai_metadata; 