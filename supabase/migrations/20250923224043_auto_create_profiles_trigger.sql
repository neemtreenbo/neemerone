-- Function that automatically creates a profile for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, created_at, updated_at)
  values (new.id, new.email, now(), now());
  return new;
end;
$$ language plpgsql security definer;

-- Trigger that fires when a new user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();