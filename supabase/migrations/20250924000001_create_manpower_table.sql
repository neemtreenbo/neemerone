-- Create manpower table with code_number as primary key
-- This table represents the advisor/manager hierarchy with recursive manager relationships

create table public.manpower (
  code_number text not null primary key,
  advisor_name text null,
  nickname text null,
  advisor_email text null,
  personal_email text null,
  mobile text null,
  birthday date null,
  date_hired date null,
  date_cancelled date null,
  status text null,
  class text null,
  unit_code text null,
  team_id uuid null,
  manager_id text null,  -- References manpower.code_number (RECURSIVE)
  profile_user_id uuid null,  -- Links to auth.users when admin assigns
  photo_url text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
) tablespace pg_default;

-- Create unique index on code_number (already primary key, but explicit for clarity)
create unique index uk_manpower_code_number on public.manpower using btree (code_number);

-- Performance indexes for hierarchy and lookups
create index idx_manpower_manager_id on public.manpower using btree (manager_id);
create index idx_manpower_profile_user_id on public.manpower using btree (profile_user_id);
create index idx_manpower_team_id on public.manpower using btree (team_id);
create index idx_manpower_status on public.manpower using btree (status);
create index idx_manpower_unit_code on public.manpower using btree (unit_code);

-- Updated_at trigger
create trigger tr_manpower_updated_at
  before update on public.manpower
  for each row
  execute function touch_updated_at();