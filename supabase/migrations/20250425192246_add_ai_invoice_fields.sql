alter table public.invoices
  add column generated_by_ai boolean default false,
  add column ai_metadata jsonb;

create table public.ai_invoice_feedback (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  rating int check (rating between 1 and 5),
  comments text,
  created_at timestamptz default now()
);
