-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_invoice_id ON public.reminders (invoice_id);

-- Add missing indexes for reminders foreign keys (added later)
CREATE INDEX IF NOT EXISTS idx_reminders_client_id ON public.reminders (client_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders (user_id);

-- Drop unused indexes
DROP INDEX IF EXISTS public.reminders_user_id_idx;
