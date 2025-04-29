ALTER TABLE profiles
RENAME COLUMN company_logo TO company_logo_url;

ALTER TABLE profiles
ADD COLUMN company_email TEXT;
