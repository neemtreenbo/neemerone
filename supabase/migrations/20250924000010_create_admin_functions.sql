-- Phase 5: Admin Functions for User Linking and Assignments
-- These functions provide admin-only operations for managing the system

-- =============================================================================
-- USER LINKING FUNCTIONS
-- =============================================================================

-- Function to link a user to a manpower record
create or replace function public.admin_link_user_to_manpower(
  target_user_id uuid,
  target_code_number text
)
returns json as $$
declare
  result_record record;
begin
  -- Security check: only admin can link users
  if public.get_user_app_role(auth.uid()) != 'admin' then
    raise exception 'Access denied: Only admin users can link users to manpower records';
  end if;

  -- Validate that the user exists
  if not public.is_user_active(target_user_id) then
    raise exception 'User with ID % does not exist or is not active', target_user_id;
  end if;

  -- Validate that the manpower record exists
  if not exists(select 1 from public.manpower where code_number = target_code_number) then
    raise exception 'Manpower record with code % does not exist', target_code_number;
  end if;

  -- Check if user is already linked to another manpower record
  if exists(select 1 from public.manpower where profile_user_id = target_user_id) then
    raise exception 'User is already linked to a manpower record. Unlink first if needed.';
  end if;

  -- Check if manpower record is already linked to another user
  if exists(select 1 from public.manpower where code_number = target_code_number and profile_user_id is not null) then
    raise exception 'Manpower record % is already linked to another user', target_code_number;
  end if;

  -- Perform the linking
  update public.manpower
  set profile_user_id = target_user_id,
      updated_at = now()
  where code_number = target_code_number
  returning * into result_record;

  -- Return success response
  return json_build_object(
    'success', true,
    'message', 'User successfully linked to manpower record',
    'user_id', target_user_id,
    'code_number', target_code_number,
    'linked_at', now()
  );
end;
$$ language plpgsql security definer;

-- Function to unlink a user from a manpower record
create or replace function public.admin_unlink_user_from_manpower(
  target_code_number text
)
returns json as $$
declare
  old_user_id uuid;
begin
  -- Security check: only admin can unlink users
  if public.get_user_app_role(auth.uid()) != 'admin' then
    raise exception 'Access denied: Only admin users can unlink users from manpower records';
  end if;

  -- Get the current linked user
  select profile_user_id into old_user_id
  from public.manpower
  where code_number = target_code_number;

  if old_user_id is null then
    raise exception 'Manpower record % is not linked to any user', target_code_number;
  end if;

  -- Perform the unlinking
  update public.manpower
  set profile_user_id = null,
      updated_at = now()
  where code_number = target_code_number;

  return json_build_object(
    'success', true,
    'message', 'User successfully unlinked from manpower record',
    'previous_user_id', old_user_id,
    'code_number', target_code_number,
    'unlinked_at', now()
  );
end;
$$ language plpgsql security definer;

-- Function to link a user to a staff record
create or replace function public.admin_link_user_to_staff(
  target_user_id uuid,
  target_staff_id uuid
)
returns json as $$
begin
  -- Security check: only admin can link users
  if public.get_user_app_role(auth.uid()) != 'admin' then
    raise exception 'Access denied: Only admin users can link users to staff records';
  end if;

  -- Validate inputs
  if not public.is_user_active(target_user_id) then
    raise exception 'User with ID % does not exist or is not active', target_user_id;
  end if;

  if not exists(select 1 from public.staff where id = target_staff_id) then
    raise exception 'Staff record with ID % does not exist', target_staff_id;
  end if;

  -- Check for existing links
  if exists(select 1 from public.staff where profile_user_id = target_user_id) then
    raise exception 'User is already linked to a staff record';
  end if;

  if exists(select 1 from public.staff where id = target_staff_id and profile_user_id is not null) then
    raise exception 'Staff record is already linked to another user';
  end if;

  -- Perform the linking
  update public.staff
  set profile_user_id = target_user_id,
      updated_at = now()
  where id = target_staff_id;

  return json_build_object(
    'success', true,
    'message', 'User successfully linked to staff record',
    'user_id', target_user_id,
    'staff_id', target_staff_id,
    'linked_at', now()
  );
end;
$$ language plpgsql security definer;

-- =============================================================================
-- STAFF ASSIGNMENT FUNCTIONS
-- =============================================================================

-- Function to assign staff to advisor
create or replace function public.admin_assign_staff_to_advisor(
  target_staff_id uuid,
  target_advisor_code text,
  assignment_notes text default null
)
returns json as $$
declare
  assignment_id uuid;
  staff_name text;
  advisor_name text;
begin
  -- Security check: only admin can make assignments
  if public.get_user_app_role(auth.uid()) != 'admin' then
    raise exception 'Access denied: Only admin users can assign staff to advisors';
  end if;

  -- Validate inputs
  if not exists(select 1 from public.staff where id = target_staff_id) then
    raise exception 'Staff record with ID % does not exist', target_staff_id;
  end if;

  if not exists(select 1 from public.manpower where code_number = target_advisor_code) then
    raise exception 'Advisor with code % does not exist', target_advisor_code;
  end if;

  -- Check if assignment already exists and is active
  if exists(
    select 1 from public.staff_advisor_assignments
    where staff_id = target_staff_id
      and advisor_code_number = target_advisor_code
      and active = true
  ) then
    raise exception 'Staff is already assigned to advisor %', target_advisor_code;
  end if;

  -- Get names for response
  select staff_name into staff_name from public.staff where id = target_staff_id;
  select advisor_name into advisor_name from public.manpower where code_number = target_advisor_code;

  -- Create the assignment
  insert into public.staff_advisor_assignments (
    staff_id,
    advisor_code_number,
    assigned_at,
    created_by,
    active,
    notes
  ) values (
    target_staff_id,
    target_advisor_code,
    now(),
    auth.uid(),
    true,
    assignment_notes
  ) returning id into assignment_id;

  return json_build_object(
    'success', true,
    'message', 'Staff successfully assigned to advisor',
    'assignment_id', assignment_id,
    'staff_id', target_staff_id,
    'staff_name', staff_name,
    'advisor_code', target_advisor_code,
    'advisor_name', advisor_name,
    'assigned_at', now(),
    'notes', assignment_notes
  );
end;
$$ language plpgsql security definer;

-- Function to remove staff assignment
create or replace function public.admin_remove_staff_assignment(
  assignment_id uuid
)
returns json as $$
declare
  assignment_record record;
begin
  -- Security check: only admin can remove assignments
  if public.get_user_app_role(auth.uid()) != 'admin' then
    raise exception 'Access denied: Only admin users can remove staff assignments';
  end if;

  -- Get assignment details before removing
  select * into assignment_record
  from public.staff_advisor_assignments
  where id = assignment_id and active = true;

  if not found then
    raise exception 'Active assignment with ID % not found', assignment_id;
  end if;

  -- Deactivate the assignment (soft delete)
  update public.staff_advisor_assignments
  set active = false,
      notes = coalesce(notes || ' | ', '') || 'Removed by admin on ' || now()::text
  where id = assignment_id;

  return json_build_object(
    'success', true,
    'message', 'Staff assignment successfully removed',
    'assignment_id', assignment_id,
    'staff_id', assignment_record.staff_id,
    'advisor_code', assignment_record.advisor_code_number,
    'removed_at', now()
  );
end;
$$ language plpgsql security definer;

-- Function to bulk assign staff to multiple advisors
create or replace function public.admin_bulk_assign_staff(
  target_staff_id uuid,
  advisor_codes text[],
  assignment_notes text default null
)
returns json as $$
declare
  advisor_code text;
  assignment_id uuid;
  assignment_ids uuid[] := '{}';
  success_count integer := 0;
  error_count integer := 0;
  errors text[] := '{}';
begin
  -- Security check
  if public.get_user_app_role(auth.uid()) != 'admin' then
    raise exception 'Access denied: Only admin users can make bulk assignments';
  end if;

  -- Validate staff exists
  if not exists(select 1 from public.staff where id = target_staff_id) then
    raise exception 'Staff record with ID % does not exist', target_staff_id;
  end if;

  -- Process each advisor code
  foreach advisor_code in array advisor_codes
  loop
    begin
      -- Try to create assignment
      insert into public.staff_advisor_assignments (
        staff_id,
        advisor_code_number,
        assigned_at,
        created_by,
        active,
        notes
      ) values (
        target_staff_id,
        advisor_code,
        now(),
        auth.uid(),
        true,
        assignment_notes
      ) returning id into assignment_id;

      assignment_ids := assignment_ids || assignment_id;
      success_count := success_count + 1;

    exception when others then
      error_count := error_count + 1;
      errors := errors || (advisor_code || ': ' || SQLERRM);
    end;
  end loop;

  return json_build_object(
    'success', success_count > 0,
    'message', format('Bulk assignment completed: %s successes, %s errors', success_count, error_count),
    'assignment_ids', assignment_ids,
    'success_count', success_count,
    'error_count', error_count,
    'errors', errors
  );
end;
$$ language plpgsql security definer;

-- =============================================================================
-- ADMIN UTILITY FUNCTIONS
-- =============================================================================

-- Function to get comprehensive user info for admin dashboard
create or replace function public.admin_get_user_details(target_user_id uuid)
returns json as $$
declare
  profile_record record;
  manpower_record record;
  staff_record record;
  assignments_json json;
begin
  -- Security check
  if public.get_user_app_role(auth.uid()) != 'admin' then
    raise exception 'Access denied: Only admin users can access detailed user information';
  end if;

  -- Get profile info
  select * into profile_record from public.profiles where user_id = target_user_id;

  -- Get manpower info if linked
  select * into manpower_record from public.manpower where profile_user_id = target_user_id;

  -- Get staff info if linked
  select * into staff_record from public.staff where profile_user_id = target_user_id;

  -- Get staff assignments if they are staff
  if staff_record.id is not null then
    select json_agg(
      json_build_object(
        'assignment_id', saa.id,
        'advisor_code', saa.advisor_code_number,
        'advisor_name', m.advisor_name,
        'assigned_at', saa.assigned_at,
        'active', saa.active,
        'notes', saa.notes
      )
    ) into assignments_json
    from public.staff_advisor_assignments saa
    left join public.manpower m on saa.advisor_code_number = m.code_number
    where saa.staff_id = staff_record.id;
  end if;

  return json_build_object(
    'user_id', target_user_id,
    'profile', row_to_json(profile_record),
    'manpower', row_to_json(manpower_record),
    'staff', row_to_json(staff_record),
    'assignments', coalesce(assignments_json, '[]'::json)
  );
end;
$$ language plpgsql security definer;

-- Grant execute permissions only to authenticated users (security definer handles admin check)
grant execute on function public.admin_link_user_to_manpower(uuid, text) to authenticated;
grant execute on function public.admin_unlink_user_from_manpower(text) to authenticated;
grant execute on function public.admin_link_user_to_staff(uuid, uuid) to authenticated;
grant execute on function public.admin_assign_staff_to_advisor(uuid, text, text) to authenticated;
grant execute on function public.admin_remove_staff_assignment(uuid) to authenticated;
grant execute on function public.admin_bulk_assign_staff(uuid, text[], text) to authenticated;
grant execute on function public.admin_get_user_details(uuid) to authenticated;