-- Fix avatar storage RLS policies to work with flat file structure
-- This migration corrects the storage policies for the actual file naming pattern

-- Drop existing restrictive policies
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- Create new policies that work with flat file structure (user-id-timestamp.ext)
create policy "Users can upload avatar files"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  AND auth.uid()::text = substring(name from '^([a-f0-9-]+)-\d+\.')
);

-- Allow users to update their own avatar files
create policy "Users can update their avatar files"
on storage.objects for update
using (
  bucket_id = 'avatars'
  AND auth.uid()::text = substring(name from '^([a-f0-9-]+)-\d+\.')
);

-- Allow users to delete their own avatar files
create policy "Users can delete their avatar files"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  AND auth.uid()::text = substring(name from '^([a-f0-9-]+)-\d+\.')
);

-- Alternative: Simpler policy that allows authenticated users to manage their files
-- by checking if the filename starts with their user ID
drop policy if exists "Users can upload avatar files" on storage.objects;
drop policy if exists "Users can update their avatar files" on storage.objects;
drop policy if exists "Users can delete their avatar files" on storage.objects;

-- Simple policies based on filename prefix
create policy "Authenticated users can upload avatars"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND starts_with(name, auth.uid()::text)
);

create policy "Authenticated users can update their avatars"
on storage.objects for update
using (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND starts_with(name, auth.uid()::text)
);

create policy "Authenticated users can delete their avatars"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND starts_with(name, auth.uid()::text)
);