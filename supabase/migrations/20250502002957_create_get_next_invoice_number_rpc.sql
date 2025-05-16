-- Function to get the next invoice number for a specific prefix
create or replace function public.get_next_invoice_number_for_prefix(
    user_id_param uuid,
    prefix_param text
)
returns text
language plpgsql
volatile -- Modified as it relies on current state
SET search_path = ''
as $$
declare
    last_invoice_number_str text;
    last_number_part text;
    last_number integer;
    next_number integer;
    num_digits integer;
    padded_next_number text;
begin
    -- Find the highest existing invoice number for the given user and prefix
    select
        i.invoice_number
    into
        last_invoice_number_str
    from
        public.invoices i
    where
        i.user_id = user_id_param
        and i.invoice_number like prefix_param || '%'
    order by
        i.invoice_number desc
    limit 1;

    -- If no invoice exists with this prefix, start from 1
    if last_invoice_number_str is null then
        return prefix_param || '001'; -- Default to 3 digits padding for new sequences
    end if;

    -- Extract the numeric part from the last invoice number
    last_number_part := substring(last_invoice_number_str from '(\d+)$');

    if last_number_part is null then
        -- Could not extract number part, maybe a strange format?
        -- Return default or raise error? Let's return default for now.
         raise warning 'Could not extract number part from invoice number: %', last_invoice_number_str;
        return prefix_param || '001';
    end if;

    -- Get the number of digits for padding
    num_digits := length(last_number_part);

    -- Increment the number
    last_number := last_number_part::integer;
    next_number := last_number + 1;

    -- Pad the next number with leading zeros
    padded_next_number := lpad(next_number::text, num_digits, '0');

    -- Construct the next invoice number string
    return prefix_param || padded_next_number;
end;
$$;
