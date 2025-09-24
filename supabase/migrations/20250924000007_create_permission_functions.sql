-- Phase 2.3: Permission Check Functions
-- These functions implement the core "One RLS To Rule Them All" logic

-- Function to check if a user can read a specific manpower record
create or replace function public.can_read_manpower(target_code text, current_user_id uuid)
returns boolean as $$
declare
  user_role app_role_type;
  user_manpower_code text;
begin
  -- Get the current user's role
  user_role := public.get_user_app_role(current_user_id);

  -- Admin can read everything
  if user_role = 'admin' then
    return true;
  end if;

  -- Manager can read own record + all subordinates
  if user_role = 'manager' then
    user_manpower_code := public.get_user_manpower_code(current_user_id);

    -- Can read own record
    if user_manpower_code = target_code then
      return true;
    end if;

    -- Can read subordinates
    return public.is_subordinate_of(target_code, user_manpower_code);
  end if;

  -- Staff can read assigned advisors and their subordinates
  if user_role = 'staff' then
    -- Check if target is directly assigned
    if exists(
      select 1 from public.get_staff_assigned_advisors(current_user_id)
      where advisor_code = target_code
    ) then
      return true;
    end if;

    -- Check if target is a subordinate of any assigned advisor
    return exists(
      select 1
      from public.get_staff_assigned_advisors(current_user_id) saa
      where public.is_subordinate_of(target_code, saa.advisor_code)
    );
  end if;

  -- Advisor/Candidate can read only their own record
  if user_role in ('advisor', 'candidate') then
    user_manpower_code := public.get_user_manpower_code(current_user_id);
    return user_manpower_code = target_code;
  end if;

  -- Default: no access
  return false;
end;
$$ language plpgsql security definer;

-- Function to check if a user can write to a specific manpower record
create or replace function public.can_write_manpower(target_code text, current_user_id uuid)
returns boolean as $$
declare
  user_role app_role_type;
  user_manpower_code text;
begin
  user_role := public.get_user_app_role(current_user_id);

  -- Admin can write everything
  if user_role = 'admin' then
    return true;
  end if;

  -- Everyone else can only write to their own record
  user_manpower_code := public.get_user_manpower_code(current_user_id);
  return user_manpower_code = target_code;
end;
$$ language plpgsql security definer;

-- Function to check if a user can read a team record
create or replace function public.can_read_team(target_team_id uuid, current_user_id uuid)
returns boolean as $$
declare
  user_role app_role_type;
  team_head_code text;
begin
  user_role := public.get_user_app_role(current_user_id);

  -- Admin can read everything
  if user_role = 'admin' then
    return true;
  end if;

  -- Get the team head code
  select head_manpower_code into team_head_code
  from public.teams
  where id = target_team_id;

  -- If no team head, only admin can read
  if team_head_code is null then
    return false;
  end if;

  -- Check if user can read the team head's data (which includes team access)
  return public.can_read_manpower(team_head_code, current_user_id);
end;
$$ language plpgsql security definer;

-- Function to check if a user can read staff assignment records
create or replace function public.can_read_staff_assignment(target_staff_id uuid, target_advisor_code text, current_user_id uuid)
returns boolean as $$
declare
  user_role app_role_type;
begin
  user_role := public.get_user_app_role(current_user_id);

  -- Admin can read everything
  if user_role = 'admin' then
    return true;
  end if;

  -- Staff can read their own assignments
  if user_role = 'staff' and public.get_user_staff_id(current_user_id) = target_staff_id then
    return true;
  end if;

  -- Advisor can read assignments related to them
  if user_role in ('advisor', 'candidate') and public.get_user_manpower_code(current_user_id) = target_advisor_code then
    return true;
  end if;

  -- Manager can read assignments for their subordinates
  if user_role = 'manager' then
    return public.can_read_manpower(target_advisor_code, current_user_id);
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- Universal function for user-owned table access (for future tables)
-- This implements the standard owner_user_id pattern
create or replace function public.can_access_user_owned_row(owner_user_id uuid, current_user_id uuid, operation text)
returns boolean as $$
declare
  user_role app_role_type;
  owner_manpower_code text;
begin
  user_role := public.get_user_app_role(current_user_id);

  -- Admin can do everything
  if user_role = 'admin' then
    return true;
  end if;

  -- For CREATE operations, only allow creating own records (except admin)
  if operation = 'CREATE' then
    return owner_user_id = current_user_id;
  end if;

  -- For UPDATE/DELETE operations, only allow modifying own records (except admin)
  if operation in ('UPDATE', 'DELETE') then
    return owner_user_id = current_user_id;
  end if;

  -- For READ operations, apply hierarchy rules
  if operation = 'READ' then
    -- Own records
    if owner_user_id = current_user_id then
      return true;
    end if;

    -- Get owner's manpower code
    owner_manpower_code := public.get_user_manpower_code(owner_user_id);

    -- If owner has no manpower record, only they and admin can access
    if owner_manpower_code is null then
      return false;
    end if;

    -- Manager can read subordinates' data
    if user_role = 'manager' then
      return public.can_read_manpower(owner_manpower_code, current_user_id);
    end if;

    -- Staff can read assigned advisors' data
    if user_role = 'staff' then
      return exists(
        select 1 from public.get_staff_assigned_advisors(current_user_id)
        where advisor_code = owner_manpower_code
      ) or exists(
        select 1
        from public.get_staff_assigned_advisors(current_user_id) saa
        where public.is_subordinate_of(owner_manpower_code, saa.advisor_code)
      );
    end if;
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function public.can_read_manpower(text, uuid) to authenticated;
grant execute on function public.can_write_manpower(text, uuid) to authenticated;
grant execute on function public.can_read_team(uuid, uuid) to authenticated;
grant execute on function public.can_read_staff_assignment(uuid, text, uuid) to authenticated;
grant execute on function public.can_access_user_owned_row(uuid, uuid, text) to authenticated;