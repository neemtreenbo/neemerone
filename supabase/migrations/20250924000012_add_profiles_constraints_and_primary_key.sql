-- Add constraints and primary key to profiles table
-- Ensures data integrity for the Neem Tree advisor performance monitoring portal

-- Phase 1: Add primary key constraint
-- The user_id should be the primary key since it references auth.users(id)
alter table public.profiles
add constraint profiles_pkey primary key (user_id);

-- Phase 2: Add foreign key constraint to auth.users
-- Ensures referential integrity between profiles and auth users
-- CASCADE DELETE ensures profile is removed when user is deleted
alter table public.profiles
add constraint profiles_user_id_fkey
foreign key (user_id) references auth.users(id) on delete cascade;

-- Phase 3: Add unique constraint on email
-- Critical for business logic - each email should be unique
-- Allow null emails but ensure uniqueness when provided
create unique index idx_profiles_email_unique
on public.profiles (email)
where email is not null and email != '';

-- Phase 4: Add check constraints for data validation
-- Email format validation
alter table public.profiles
add constraint profiles_email_format_check
check (
  email is null or
  email = '' or
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- First name length constraint (reasonable business limit)
alter table public.profiles
add constraint profiles_first_name_length_check
check (
  first_name is null or
  (length(trim(first_name)) >= 1 and length(trim(first_name)) <= 100)
);

-- Last name length constraint (reasonable business limit)
alter table public.profiles
add constraint profiles_last_name_length_check
check (
  last_name is null or
  (length(trim(last_name)) >= 1 and length(trim(last_name)) <= 100)
);

-- Photo URL format validation (basic URL pattern)
alter table public.profiles
add constraint profiles_photo_url_format_check
check (
  photo_url is null or
  photo_url = '' or
  photo_url ~* '^https?://[^\s/$.?#].[^\s]*$'
);

-- Phase 5: Add performance indexes
-- Index on email for login/lookup performance
create index idx_profiles_email
on public.profiles using btree (email)
where email is not null and email != '';

-- Index on onboarding_completed for filtering
create index idx_profiles_onboarding_completed
on public.profiles using btree (onboarding_completed);

-- Composite index for dashboard queries (role + onboarding status)
create index idx_profiles_role_onboarding
on public.profiles using btree (app_role, onboarding_completed);

-- Index on full name search (for advisor search functionality)
create index idx_profiles_full_name
on public.profiles using gin (
  to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
)
where first_name is not null or last_name is not null;

-- Phase 6: Add updated_at trigger
-- Create function to automatically update the updated_at timestamp
create or replace function public.update_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at on any update
create trigger profiles_updated_at_trigger
  before update on public.profiles
  for each row
  execute function public.update_profiles_updated_at();

-- Add comment for documentation
comment on table public.profiles is 'User profiles for the Neem Tree advisor performance monitoring portal. Links to auth.users with additional business information.';
comment on column public.profiles.user_id is 'Primary key. References auth.users(id) with cascade delete.';
comment on column public.profiles.email is 'Unique email address. Used for login and notifications.';
comment on column public.profiles.app_role is 'Business role in the insurance advisor hierarchy. Enum: admin, manager, staff, advisor, candidate.';
comment on column public.profiles.onboarding_completed is 'Tracks whether the user has completed the initial setup process.';