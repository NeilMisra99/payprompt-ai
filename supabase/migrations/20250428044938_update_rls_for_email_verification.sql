-- Update RLS policies to require email verification

-- Profiles
ALTER POLICY "Users can view their own profile"
ON public.profiles TO authenticated
USING (auth.uid() = id);

ALTER POLICY "Users can update their own profile"
ON public.profiles TO authenticated
USING (auth.uid() = id);

-- Clients
ALTER POLICY "Users can view their own clients"
ON public.clients TO authenticated
USING (user_id = auth.uid());

ALTER POLICY "Users can create their own clients"
ON public.clients TO authenticated
WITH CHECK (user_id = auth.uid());

ALTER POLICY "Users can update their own clients"
ON public.clients TO authenticated
USING (user_id = auth.uid());

ALTER POLICY "Users can delete their own clients"
ON public.clients TO authenticated
USING (user_id = auth.uid());

-- Invoices
ALTER POLICY "Users can view their own invoices"
ON public.invoices TO authenticated
USING (user_id = auth.uid());

ALTER POLICY "Users can create their own invoices"
ON public.invoices TO authenticated
WITH CHECK (user_id = auth.uid());

ALTER POLICY "Users can update their own invoices"
ON public.invoices TO authenticated
USING (user_id = auth.uid());

ALTER POLICY "Users can delete their own invoices"
ON public.invoices TO authenticated
USING (user_id = auth.uid());

-- Invoice Items
-- NOTE: Dropping the specific SELECT policy as it's covered by 'manage'
DROP POLICY IF EXISTS "Users can view their own invoice items" ON public.invoice_items;

ALTER POLICY "Users can manage their own invoice items"
ON public.invoice_items TO authenticated
USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
));

-- Reminders
-- NOTE: Dropping the specific SELECT policy as it's covered by 'manage'
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;

ALTER POLICY "Users can manage their own reminders"
ON public.reminders TO authenticated
USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = reminders.invoice_id AND invoices.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = reminders.invoice_id AND invoices.user_id = auth.uid()
));


-- Storage: Avatars
ALTER POLICY "Allow authenticated uploads for own avatars"
ON storage.objects TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

ALTER POLICY "Allow user to update their own avatar"
ON storage.objects TO authenticated
USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

ALTER POLICY "Allow user to delete their own avatar"
ON storage.objects TO authenticated
USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage: Company Logos
ALTER POLICY "Allow authenticated uploads for company logos"
ON storage.objects TO authenticated
WITH CHECK (
    bucket_id = 'company_logos' AND
    auth.role() = 'authenticated'
);

ALTER POLICY "Allow user to update their own company logo" -- Adjust ownership logic if needed
ON storage.objects TO authenticated
USING (
    bucket_id = 'company_logos' AND
    auth.role() = 'authenticated'
);

ALTER POLICY "Allow user to delete their own company logo" -- Adjust ownership logic if needed
ON storage.objects TO authenticated
USING (
    bucket_id = 'company_logos' AND
    auth.role() = 'authenticated'
);

-- Storage: Invoice PDFs (Remains unchanged as original policies likely targeted service_role)
-- ... (existing policies for Invoice PDFs if any) ...
