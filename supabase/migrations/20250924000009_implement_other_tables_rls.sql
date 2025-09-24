-- Phase 3.2: Implement RLS policies for teams, staff, and assignments tables

-- =============================================================================
-- TEAMS TABLE RLS
-- =============================================================================

-- Enable RLS for teams table
alter table public.teams enable row level security;

-- Teams READ policy - can read team if you can read the team head
create policy "teams_read_policy" on public.teams
for select using (
  public.can_read_team(id, auth.uid())
);

-- Teams CREATE policy - only admin can create teams
create policy "teams_create_policy" on public.teams
for insert with check (
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- Teams UPDATE policy - only admin can update teams
create policy "teams_update_policy" on public.teams
for update using (
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- Teams DELETE policy - only admin can delete teams
create policy "teams_delete_policy" on public.teams
for delete using (
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- =============================================================================
-- STAFF TABLE RLS
-- =============================================================================

-- Enable RLS for staff table
alter table public.staff enable row level security;

-- Staff READ policy - admin can read all, others can read own record
create policy "staff_read_policy" on public.staff
for select using (
  public.get_user_app_role(auth.uid()) = 'admin' or
  profile_user_id = auth.uid()
);

-- Staff CREATE policy - admin can create any, others can create own
create policy "staff_create_policy" on public.staff
for insert with check (
  public.get_user_app_role(auth.uid()) = 'admin' or
  profile_user_id = auth.uid()
);

-- Staff UPDATE policy - admin can update any, others can update own
create policy "staff_update_policy" on public.staff
for update using (
  public.get_user_app_role(auth.uid()) = 'admin' or
  profile_user_id = auth.uid()
);

-- Staff DELETE policy - admin can delete any, others can delete own
create policy "staff_delete_policy" on public.staff
for delete using (
  public.get_user_app_role(auth.uid()) = 'admin' or
  profile_user_id = auth.uid()
);

-- =============================================================================
-- STAFF ADVISOR ASSIGNMENTS TABLE RLS
-- =============================================================================

-- Enable RLS for staff_advisor_assignments table
alter table public.staff_advisor_assignments enable row level security;

-- Assignments READ policy - admin, assigned staff, or assigned advisor can read
create policy "assignments_read_policy" on public.staff_advisor_assignments
for select using (
  public.can_read_staff_assignment(staff_id, advisor_code_number, auth.uid())
);

-- Assignments CREATE policy - only admin can create assignments
create policy "assignments_create_policy" on public.staff_advisor_assignments
for insert with check (
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- Assignments UPDATE policy - only admin can update assignments
create policy "assignments_update_policy" on public.staff_advisor_assignments
for update using (
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- Assignments DELETE policy - only admin can delete assignments
create policy "assignments_delete_policy" on public.staff_advisor_assignments
for delete using (
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- =============================================================================
-- PROFILES TABLE RLS (Update existing or create if not exists)
-- =============================================================================

-- Enable RLS for profiles table if not already enabled
alter table public.profiles enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "profiles_read_policy" on public.profiles;
drop policy if exists "profiles_create_policy" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "profiles_delete_policy" on public.profiles;

-- Profiles READ policy - admin can read all, managers can read subordinates, staff can read assigned advisors, others read own
create policy "profiles_read_policy" on public.profiles
for select using (
  public.get_user_app_role(auth.uid()) = 'admin' or
  user_id = auth.uid() or
  (
    public.get_user_app_role(auth.uid()) = 'manager' and
    public.can_read_manpower(public.get_user_manpower_code(user_id), auth.uid())
  ) or
  (
    public.get_user_app_role(auth.uid()) = 'staff' and
    exists(
      select 1 from public.get_staff_assigned_advisors(auth.uid())
      where advisor_code = public.get_user_manpower_code(user_id)
    )
  )
);

-- Profiles CREATE policy - should be handled by trigger, but allow admin and self
create policy "profiles_create_policy" on public.profiles
for insert with check (
  public.get_user_app_role(auth.uid()) = 'admin' or
  user_id = auth.uid()
);

-- Profiles UPDATE policy - admin can update any, others can update own
create policy "profiles_update_policy" on public.profiles
for update using (
  public.get_user_app_role(auth.uid()) = 'admin' or
  user_id = auth.uid()
);

-- Profiles DELETE policy - only admin can delete profiles
create policy "profiles_delete_policy" on public.profiles
for delete using (
  public.get_user_app_role(auth.uid()) = 'admin'
);

-- =============================================================================
-- POLICY DOCUMENTATION
-- =============================================================================

-- Add comments for documentation
comment on policy "teams_read_policy" on public.teams is
'Users can read team data if they have access to the team head manpower record';

comment on policy "staff_read_policy" on public.staff is
'Admin can read all staff records, others can only read their own staff record';

comment on policy "assignments_read_policy" on public.staff_advisor_assignments is
'Admin, assigned staff member, assigned advisor, or advisor managers can read assignment records';

comment on policy "profiles_read_policy" on public.profiles is
'Hierarchical access: admin (all), manager (subordinates), staff (assigned advisors), user (self)';

-- Add performance indexes for RLS
create index if not exists idx_staff_rls_lookup on public.staff (profile_user_id);
create index if not exists idx_assignments_rls_lookup on public.staff_advisor_assignments (staff_id, advisor_code_number, active);
create index if not exists idx_profiles_rls_lookup on public.profiles (user_id, app_role);