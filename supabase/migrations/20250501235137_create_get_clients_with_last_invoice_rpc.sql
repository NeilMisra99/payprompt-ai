-- Define the RPC function to get clients with their last invoice number
create or replace function public.get_clients_with_last_invoice(user_id_param uuid)
returns table (
    id uuid,
    name text,
    email text,
    phone text,
    address text,
    contact_person text,
    user_id uuid,
    last_invoice_number text -- Added column for the last invoice number
)
language sql
stable
SET search_path = '' -- Explicitly set search path
as $$
with ranked_invoices as (
  select
    inv.client_id,
    inv.invoice_number,
    inv.issue_date,
    -- Assign a row number to each invoice per client, ordered by invoice_number descending
    -- This finds the highest numbered invoice, not necessarily the latest issue date.
    row_number() over (partition by inv.client_id order by inv.invoice_number desc) as rn
  from
    public.invoices inv
  where
    inv.user_id = user_id_param
)
select
  c.id,
  c.name,
  c.email,
  c.phone,
  c.address,
  c.contact_person,
  c.user_id,
  -- Select the invoice number from the ranked invoices where the rank is 1 (most recent)
  ri.invoice_number as last_invoice_number
from
  public.clients c
left join
  -- Left join to include clients who may not have any invoices yet
  ranked_invoices ri on c.id = ri.client_id and ri.rn = 1
where
  c.user_id = user_id_param;
$$;
