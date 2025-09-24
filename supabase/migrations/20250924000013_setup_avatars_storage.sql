-- Setup avatars storage bucket for user profile pictures
-- This migration creates the storage bucket and sets up RLS policies

-- Create the avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Enable RLS for the avatars bucket
create policy "Avatar images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Create a function to get avatar URL helper
create or replace function public.get_avatar_url(user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  avatar_path text;
begin
  select photo_url into avatar_path
  from public.profiles
  where profiles.user_id = get_avatar_url.user_id;

  return avatar_path;
end;
$$;

-- Add RLS policy for the get_avatar_url function
create policy "Users can access avatar URL function"
on public.profiles for select
using (true); -- This is already covered by existing RLS

-- Comments removed due to permission restrictions in hosted Supabase