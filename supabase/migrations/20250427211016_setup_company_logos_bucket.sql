-- Create company_logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company_logos', 'company_logos', true)
ON CONFLICT (id) DO NOTHING; -- Avoid error if bucket already exists

-- Set up RLS policies for company_logos bucket

-- Allow public read access
CREATE POLICY "Allow public read access on company logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'company_logos' );

-- Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated uploads for company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'company_logos' );

-- Allow users to update their own company logo
-- We'll use the user's ID stored in the object metadata or path
-- Assuming the logo path is like: user_id/logo.png or metadata contains user_id
CREATE POLICY "Allow user to update their own company logo"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'company_logos' AND auth.uid() = (storage.foldername(name))[1]::uuid ) -- Check if first folder name matches user ID
WITH CHECK ( bucket_id = 'company_logos' AND auth.uid() = (storage.foldername(name))[1]::uuid ); -- Ensure user can only update their folder

-- Optional: Allow users to delete their own company logo
CREATE POLICY "Allow user to delete their own company logo"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'company_logos' AND auth.uid() = (storage.foldername(name))[1]::uuid ); -- Check if first folder name matches user ID
