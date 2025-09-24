-- Create the touch_updated_at function that's used by all update triggers
-- This function automatically updates the updated_at column when a row is modified

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;