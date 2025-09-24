-- Storage policies for manpower-photos bucket
-- Allow admin users to upload, view, and delete manpower photos

-- Create the bucket if it doesn't exist (this should be done manually in dashboard)
-- insert into storage.buckets (id, name, public) values ('manpower-photos', 'manpower-photos', true)
-- on conflict (id) do nothing;

-- Policy for uploading photos (INSERT)
-- Only admin users can upload to manpower-photos bucket
create policy "manpower_photos_upload_policy" on storage.objects
for insert with check (
  bucket_id = 'manpower-photos' and
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- Policy for viewing photos (SELECT)
-- All authenticated users can view manpower photos
create policy "manpower_photos_view_policy" on storage.objects
for select using (
  bucket_id = 'manpower-photos' and
  auth.role() = 'authenticated'
);

-- Policy for updating photos (UPDATE)
-- Only admin users can update manpower photos
create policy "manpower_photos_update_policy" on storage.objects
for update using (
  bucket_id = 'manpower-photos' and
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- Policy for deleting photos (DELETE)
-- Only admin users can delete manpower photos
create policy "manpower_photos_delete_policy" on storage.objects
for delete using (
  bucket_id = 'manpower-photos' and
  public.get_user_app_role(auth.uid()) = 'admin'
);

