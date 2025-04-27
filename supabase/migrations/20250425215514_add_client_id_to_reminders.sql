ALTER TABLE public.reminders
ADD COLUMN client_id UUID;

-- Optional: Add a foreign key constraint if desired (recommended)
-- Ensure the clients table exists and has a primary key named 'id'
ALTER TABLE public.reminders
ADD CONSTRAINT reminders_client_id_fkey FOREIGN KEY (client_id)
REFERENCES public.clients(id)
ON DELETE SET NULL; -- Or ON DELETE CASCADE, depending on desired behavior

-- Optional: Add an index for performance if you query by client_id often
CREATE INDEX IF NOT EXISTS idx_reminders_client_id ON public.reminders(client_id);

