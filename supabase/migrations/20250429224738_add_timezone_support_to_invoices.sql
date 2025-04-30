-- 1. Add timezone to profiles table (defaults to UTC for existing)
ALTER TABLE public.profiles
ADD COLUMN timezone text
  -- Allow simple names (UTC, GMT) or IANA format (Area/Location)
  CHECK (timezone ~ '^[A-Za-z_]+(/[A-Za-z_]+)?$')
  DEFAULT 'UTC';

-- 2. Add timezone override and calculated due_at timestamp to invoices table
ALTER TABLE public.invoices
ADD COLUMN timezone text
  CHECK (timezone IS NULL OR timezone ~ '^[A-Za-z_]+/[A-Za-z_]+$'), -- Optional override
ADD COLUMN due_at timestamptz; -- Will store the precise deadline

-- 3. Create the trigger function to calculate due_at
CREATE OR REPLACE FUNCTION public.trg_set_due_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  profile_timezone TEXT;
BEGIN
  -- Fetch the profile's default timezone
  SELECT timezone INTO profile_timezone
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  -- If due_at wasn't manually provided and due_date exists, calculate it
  IF NEW.due_at IS NULL AND NEW.due_date IS NOT NULL THEN
    -- Use the invoice's specific timezone if provided, otherwise use the profile's default
    NEW.due_at :=
      -- Construct the timestamp at the end of the due_date
      (NEW.due_date::timestamp + interval '23 hours 59 minutes 59 seconds')
      -- Set it in the determined timezone (invoice override > profile default > UTC fallback)
      AT TIME ZONE COALESCE(NEW.timezone, profile_timezone, 'UTC');
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create the trigger on the invoices table
CREATE TRIGGER set_due_at
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_due_at();
