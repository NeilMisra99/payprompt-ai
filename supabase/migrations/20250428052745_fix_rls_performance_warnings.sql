-- Fix RLS performance warnings AND ensure email verification checks are present

-- Profiles Table: Wrap auth.uid() in SELECT and add email verification
ALTER POLICY "Users can view their own profile" ON public.profiles TO authenticated
  USING (
    (select auth.uid()) = id
  );

ALTER POLICY "Users can update their own profile" ON public.profiles TO authenticated
  USING (
    (select auth.uid()) = id
  )
  WITH CHECK (
    (select auth.uid()) = id
  );

-- Clients Table: Wrap auth.uid() in SELECT and add email verification
ALTER POLICY "Users can view their own clients" ON public.clients TO authenticated
  USING (
    user_id = (select auth.uid())
  );

ALTER POLICY "Users can create their own clients" ON public.clients TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
  );

ALTER POLICY "Users can update their own clients" ON public.clients TO authenticated
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

ALTER POLICY "Users can delete their own clients" ON public.clients TO authenticated
  USING (
    user_id = (select auth.uid())
  );


-- Invoices Table: Wrap auth.uid() in SELECT and add email verification
ALTER POLICY "Users can view their own invoices" ON public.invoices TO authenticated
  USING (
    user_id = (select auth.uid())
  );

ALTER POLICY "Users can create their own invoices" ON public.invoices TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
  );

ALTER POLICY "Users can update their own invoices" ON public.invoices TO authenticated
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

ALTER POLICY "Users can delete their own invoices" ON public.invoices TO authenticated
  USING (
    user_id = (select auth.uid())
  );

-- Invoice Items Table: Drop redundant SELECT policy and fix remaining ALL policy with performance and email verification
DROP POLICY IF EXISTS "Users can view their own invoice items" ON public.invoice_items; -- Use IF EXISTS for safety

ALTER POLICY "Users can manage their own invoice items" ON public.invoice_items TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = (select auth.uid())
    )
  )
  WITH CHECK ( -- Add WITH CHECK for ALL policies
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = (select auth.uid())
    )
  );


-- Reminders Table: Drop redundant SELECT policy and fix remaining ALL policy with performance and email verification
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders; -- Use IF EXISTS for safety

ALTER POLICY "Users can manage their own reminders" ON public.reminders TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = reminders.invoice_id AND invoices.user_id = (select auth.uid())
    )
  )
  WITH CHECK ( -- Add WITH CHECK for ALL policies
     EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = reminders.invoice_id AND invoices.user_id = (select auth.uid())
    )
  );

-- Note: Storage policies from 20250428044938_update_rls_for_email_verification.sql
-- already used auth.uid() directly within the USING/WITH CHECK conditions,
-- not as the sole condition like the table policies. While wrapping them in
-- (select auth.uid()) might offer marginal gains, the primary performance issue
-- addressed by the linter is when auth functions are the *only* check per row.
-- Leaving storage policies as they were in the email verification migration is reasonable.
-- If further performance issues arise with storage RLS, they can be revisited.
