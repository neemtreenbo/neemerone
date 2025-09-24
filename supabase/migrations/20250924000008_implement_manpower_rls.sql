-- Phase 3.1: Implement RLS policies for manpower table
-- This is the core table with the most complex hierarchy-based permissions

-- Enable Row Level Security on manpower table
alter table public.manpower enable row level security;

-- Policy for SELECT (READ) operations
-- Users can read records based on their role and hierarchy position
create policy "manpower_read_policy" on public.manpower
for select using (
  public.can_read_manpower(code_number, auth.uid())
);

-- Policy for INSERT (CREATE) operations
-- Admin can create any record, others can only create records linked to themselves
create policy "manpower_create_policy" on public.manpower
for insert with check (
  public.get_user_app_role(auth.uid()) = 'admin' or
  profile_user_id = auth.uid()
);

-- Policy for UPDATE operations
-- Admin can update any record, others can only update their own linked records
create policy "manpower_update_policy" on public.manpower
for update using (
  public.can_write_manpower(code_number, auth.uid())
);

-- Policy for DELETE operations
-- Only admin can delete manpower records (business rule)
create policy "manpower_delete_policy" on public.manpower
for delete using (
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- Create comments on policies for documentation
comment on policy "manpower_read_policy" on public.manpower is
'Allows users to read manpower records based on hierarchy: admin (all), manager (self + subordinates), staff (assigned advisors + their subordinates), advisor/candidate (self only)';

comment on policy "manpower_create_policy" on public.manpower is
'Allows admin to create any manpower record, others can only create records linked to their own user account';

comment on policy "manpower_update_policy" on public.manpower is
'Allows admin to update any manpower record, others can only update their own linked records';

comment on policy "manpower_delete_policy" on public.manpower is
'Only admin can delete manpower records to maintain data integrity';

-- Add index to improve RLS performance
create index if not exists idx_manpower_rls_lookup on public.manpower (profile_user_id, code_number);