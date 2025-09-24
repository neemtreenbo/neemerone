-- Create teams table
-- Represents organizational units with manager heads

create table public.teams (
  id uuid not null default gen_random_uuid(),
  unit_code text null,
  unit_name text null,
  head_manpower_code text null,  -- References manpower.code_number
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint teams_pkey primary key (id)
) tablespace pg_default;

-- Performance indexes
create index idx_teams_unit_code on public.teams using btree (unit_code);
create index idx_teams_head_manpower_code on public.teams using btree (head_manpower_code);

-- Updated_at trigger
create trigger tr_teams_updated_at
  before update on public.teams
  for each row
  execute function touch_updated_at();