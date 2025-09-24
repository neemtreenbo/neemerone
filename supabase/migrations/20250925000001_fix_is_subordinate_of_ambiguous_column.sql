-- Fix ambiguous column reference bug in is_subordinate_of function
-- This bug was preventing managers from seeing their subordinates due to SQL error

-- Replace the is_subordinate_of function with proper column qualification
-- Using CREATE OR REPLACE to avoid dropping function that has dependencies
create or replace function public.is_subordinate_of(subordinate_code text, manager_code text)
returns boolean as $$
begin
  return exists(
    select 1
    from public.get_all_subordinates(manager_code) as subordinates
    where subordinates.subordinate_code = $1
  );
end;
$$ language plpgsql security definer;

-- Re-grant execute permissions to authenticated users
grant execute on function public.is_subordinate_of(text, text) to authenticated;

-- Add comment explaining the fix
comment on function public.is_subordinate_of(text, text) is
'Fixed version: Checks if one advisor is a subordinate of another (direct or indirect). Uses table alias to resolve column ambiguity.';