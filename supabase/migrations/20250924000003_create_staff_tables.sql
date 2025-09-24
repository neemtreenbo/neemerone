-- Create staff table
-- Represents support personnel who service advisors

create table public.staff (
  id uuid not null default gen_random_uuid(),
  staff_name text null,
  email text null,
  profile_user_id uuid null,  -- Links to auth.users when admin assigns
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint staff_pkey primary key (id)
) tablespace pg_default;

-- Create staff-advisor assignments table (many-to-many relationship)
-- Staff can be assigned to multiple advisors across different teams

create table public.staff_advisor_assignments (
  id uuid not null default gen_random_uuid(),
  staff_id uuid null,  -- References staff.id
  advisor_code_number text null,  -- References manpower.code_number
  assigned_at timestamp with time zone not null default now(),
  created_by uuid null,  -- Admin who made the assignment
  active boolean not null default true,
  notes text null,  -- Optional notes about the assignment
  constraint staff_advisor_assignments_pkey primary key (id)
) tablespace pg_default;

-- Performance indexes for staff table
create index idx_staff_profile_user_id on public.staff using btree (profile_user_id);
create index idx_staff_email on public.staff using btree (email);

-- Performance indexes for assignments table
create index idx_staff_assignments_staff_id on public.staff_advisor_assignments using btree (staff_id);
create index idx_staff_assignments_advisor_code on public.staff_advisor_assignments using btree (advisor_code_number);
create index idx_staff_assignments_active on public.staff_advisor_assignments using btree (active);
create index idx_staff_assignments_created_by on public.staff_advisor_assignments using btree (created_by);

-- Composite index for active assignments lookup
create index idx_staff_assignments_active_lookup on public.staff_advisor_assignments using btree (staff_id, advisor_code_number, active);

-- Updated_at trigger for staff table
create trigger tr_staff_updated_at
  before update on public.staff
  for each row
  execute function touch_updated_at();