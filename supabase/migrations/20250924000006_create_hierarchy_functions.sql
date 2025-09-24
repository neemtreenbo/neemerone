-- Phase 2.2: Hierarchy Functions
-- These functions handle the recursive manpower hierarchy and staff assignments

-- Function to get all subordinates of a manager (recursive)
-- Returns a table with subordinate codes and their depth level
create or replace function public.get_all_subordinates(manager_code text)
returns table(subordinate_code text, level_depth integer) as $$
begin
  return query
  with recursive subordinates as (
    -- Base case: direct reports
    select
      m.code_number as subordinate_code,
      1 as level_depth
    from public.manpower m
    where m.manager_id = manager_code

    union all

    -- Recursive case: reports of reports
    select
      m.code_number as subordinate_code,
      s.level_depth + 1
    from public.manpower m
    join subordinates s on m.manager_id = s.subordinate_code
    where s.level_depth < 10  -- Prevent infinite recursion
  )
  select * from subordinates;
end;
$$ language plpgsql security definer;

-- Function to get all managers above a specific advisor (upward hierarchy)
-- Useful for checking if a user can manage someone
create or replace function public.get_all_managers(advisor_code text)
returns table(manager_code text, level_depth integer) as $$
begin
  return query
  with recursive managers as (
    -- Base case: direct manager
    select
      m.manager_id as manager_code,
      1 as level_depth
    from public.manpower m
    where m.code_number = advisor_code
      and m.manager_id is not null

    union all

    -- Recursive case: manager's manager
    select
      m.manager_id as manager_code,
      mg.level_depth + 1
    from public.manpower m
    join managers mg on m.code_number = mg.manager_code
    where m.manager_id is not null
      and mg.level_depth < 10  -- Prevent infinite recursion
  )
  select * from managers;
end;
$$ language plpgsql security definer;

-- Function to get all advisors assigned to a staff member
create or replace function public.get_staff_assigned_advisors(staff_uuid uuid)
returns table(advisor_code text) as $$
begin
  return query
  select saa.advisor_code_number
  from public.staff_advisor_assignments saa
  join public.staff s on saa.staff_id = s.id
  where s.profile_user_id = staff_uuid
    and saa.active = true;
end;
$$ language plpgsql security definer;

-- Function to get all staff members assigned to an advisor
create or replace function public.get_advisor_assigned_staff(advisor_code text)
returns table(staff_id uuid, staff_name text) as $$
begin
  return query
  select s.id, s.staff_name
  from public.staff_advisor_assignments saa
  join public.staff s on saa.staff_id = s.id
  where saa.advisor_code_number = advisor_code
    and saa.active = true;
end;
$$ language plpgsql security definer;

-- Function to check if one advisor is a subordinate of another (direct or indirect)
create or replace function public.is_subordinate_of(subordinate_code text, manager_code text)
returns boolean as $$
begin
  return exists(
    select 1
    from public.get_all_subordinates(manager_code)
    where subordinate_code = $1
  );
end;
$$ language plpgsql security definer;

-- Function to get team members for a team head
create or replace function public.get_team_members(head_manager_code text)
returns table(member_code text, member_name text) as $$
begin
  return query
  select m.code_number, m.advisor_name
  from public.manpower m
  join public.teams t on m.team_id = t.id
  where t.head_manpower_code = head_manager_code;
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function public.get_all_subordinates(text) to authenticated;
grant execute on function public.get_all_managers(text) to authenticated;
grant execute on function public.get_staff_assigned_advisors(uuid) to authenticated;
grant execute on function public.get_advisor_assigned_staff(text) to authenticated;
grant execute on function public.is_subordinate_of(text, text) to authenticated;
grant execute on function public.get_team_members(text) to authenticated;