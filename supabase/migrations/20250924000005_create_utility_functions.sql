-- Phase 2.1: Core Utility Functions
-- These functions provide basic user information lookups for RLS policies

-- Function to get a user's app role from the profiles table
create or replace function public.get_user_app_role(user_uuid uuid)
returns app_role_type as $$
begin
  return (
    select app_role
    from public.profiles
    where user_id = user_uuid
  );
end;
$$ language plpgsql security definer;

-- Function to get a user's manpower code (if they are linked to manpower)
create or replace function public.get_user_manpower_code(user_uuid uuid)
returns text as $$
begin
  return (
    select code_number
    from public.manpower
    where profile_user_id = user_uuid
  );
end;
$$ language plpgsql security definer;

-- Function to get a user's staff ID (if they are staff)
create or replace function public.get_user_staff_id(user_uuid uuid)
returns uuid as $$
begin
  return (
    select id
    from public.staff
    where profile_user_id = user_uuid
  );
end;
$$ language plpgsql security definer;

-- Function to check if a user exists and is active
create or replace function public.is_user_active(user_uuid uuid)
returns boolean as $$
begin
  return exists(
    select 1
    from public.profiles
    where user_id = user_uuid
  );
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function public.get_user_app_role(uuid) to authenticated;
grant execute on function public.get_user_manpower_code(uuid) to authenticated;
grant execute on function public.get_user_staff_id(uuid) to authenticated;
grant execute on function public.is_user_active(uuid) to authenticated;