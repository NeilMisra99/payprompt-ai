-- RLS Policies for invoice-pdfs bucket (Service Role Access)

-- Drop existing user-authenticated policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users insert own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users select own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users delete own files" ON storage.objects;

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS get_user_id_from_path(text);


-- Grant Service Role access for all actions

-- Allow server-side uploads (using service_role key)
CREATE POLICY "Allow service_role inserts" ON storage.objects
FOR INSERT TO service_role WITH CHECK (bucket_id = 'invoice-pdfs');

-- Allow server-side downloads (using service_role key)
CREATE POLICY "Allow service_role selects" ON storage.objects
FOR SELECT TO service_role USING (bucket_id = 'invoice-pdfs');

-- Allow server-side updates (using service_role key)
CREATE POLICY "Allow service_role updates" ON storage.objects
FOR UPDATE TO service_role USING (bucket_id = 'invoice-pdfs');

-- Allow server-side deletes (using service_role key)
CREATE POLICY "Allow service_role deletes" ON storage.objects
FOR DELETE TO service_role USING (bucket_id = 'invoice-pdfs');

-- Note: These policies grant broad access to the service role key for this specific bucket.
-- Ensure your service role key is kept secure.
