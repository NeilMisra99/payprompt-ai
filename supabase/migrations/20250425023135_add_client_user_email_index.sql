-- Add the UNIQUE index required for efficient client upsert based on user_id and email
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_email_idx ON public.clients (user_id, email);

