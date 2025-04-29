ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS company_address; -- Drop old column if it exists

ALTER TABLE public.profiles
  ADD COLUMN company_address_street TEXT,
  ADD COLUMN company_address_line2 TEXT, -- Optional second line
  ADD COLUMN company_address_city TEXT,
  ADD COLUMN company_address_state TEXT, -- State / Province / Region
  ADD COLUMN company_address_postal_code TEXT,
  ADD COLUMN company_address_country TEXT;
