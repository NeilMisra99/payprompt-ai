-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING; -- Avoid error if bucket already exists

-- Set up RLS policies for avatars bucket

-- Allow public read access
CREATE POLICY "Allow public read access on avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars into their own folder
-- Path must be like: <user_id>/<filename>
CREATE POLICY "Allow authenticated uploads for own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid AND -- Ensures first folder IS the user ID
  array_length(storage.foldername(name), 1) = 1 -- Ensures path is exactly user_id/filename.ext
);

-- Allow users to update their own avatar (in their folder)
CREATE POLICY "Allow user to update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid AND
  array_length(storage.foldername(name), 1) = 1
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid AND
  array_length(storage.foldername(name), 1) = 1
);

-- Allow users to delete their own avatar (in their folder)
CREATE POLICY "Allow user to delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid AND
  array_length(storage.foldername(name), 1) = 1
);
