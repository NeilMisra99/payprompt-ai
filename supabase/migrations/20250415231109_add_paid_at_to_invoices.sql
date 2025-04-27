ALTER TABLE public.invoices
ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN public.invoices.paid_at IS 'Timestamp indicating when the invoice was marked as paid.';
