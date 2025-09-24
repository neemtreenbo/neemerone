-- Phase 4: Template for User-Owned Tables with Universal RLS
-- This migration serves as a template for future user-owned tables
-- Following the "One RLS To Rule Them All" pattern

-- Example: leads table (you can copy this pattern for activities, notes, email_history, etc.)
create table public.leads (
  id uuid not null default gen_random_uuid(),
  owner_user_id uuid not null,  -- Standard owner pattern - references auth.users(id)

  -- Business-specific fields (customize for each table)
  lead_name text null,
  email text null,
  phone text null,
  status text null,
  source text null,
  notes text null,

  -- Standard audit fields
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint leads_pkey primary key (id)
) tablespace pg_default;

-- Performance indexes
create index idx_leads_owner_user_id on public.leads using btree (owner_user_id);
create index idx_leads_status on public.leads using btree (status);
create index idx_leads_created_at on public.leads using btree (created_at);

-- Updated_at trigger
create trigger tr_leads_updated_at
  before update on public.leads
  for each row
  execute function touch_updated_at();

-- Enable RLS
alter table public.leads enable row level security;

-- Universal RLS Policies using the "One RLS To Rule Them All" pattern

-- READ Policy: Hierarchical access based on user role and relationships
create policy "leads_read_policy" on public.leads
for select using (
  -- Admin can read everything
  public.get_user_app_role(auth.uid()) = 'admin' or

  -- Owner can read their own records
  owner_user_id = auth.uid() or

  -- Manager can read subordinates' records
  (
    public.get_user_app_role(auth.uid()) = 'manager' and
    public.can_read_manpower(public.get_user_manpower_code(owner_user_id), auth.uid())
  ) or

  -- Staff can read assigned advisors' records
  (
    public.get_user_app_role(auth.uid()) = 'staff' and
    (
      -- Direct assignment
      exists(
        select 1 from public.get_staff_assigned_advisors(auth.uid())
        where advisor_code = public.get_user_manpower_code(owner_user_id)
      ) or
      -- Subordinate of assigned advisor
      exists(
        select 1
        from public.get_staff_assigned_advisors(auth.uid()) saa
        where public.is_subordinate_of(public.get_user_manpower_code(owner_user_id), saa.advisor_code)
      )
    )
  )
);

-- CREATE Policy: Admin can create any, others can create only for themselves
create policy "leads_create_policy" on public.leads
for insert with check (
  public.get_user_app_role(auth.uid()) = 'admin' or
  owner_user_id = auth.uid()
);

-- UPDATE Policy: Admin can update any, others can update only their own
create policy "leads_update_policy" on public.leads
for update using (
  public.get_user_app_role(auth.uid()) = 'admin' or
  owner_user_id = auth.uid()
);

-- DELETE Policy: Admin can delete any, others can delete only their own
create policy "leads_delete_policy" on public.leads
for delete using (
  public.get_user_app_role(auth.uid()) = 'admin' or
  owner_user_id = auth.uid()
);

-- Policy documentation
comment on policy "leads_read_policy" on public.leads is
'Universal read policy: admin (all), manager (subordinates), staff (assigned advisors + subordinates), owner (self)';

comment on policy "leads_create_policy" on public.leads is
'Universal create policy: admin (any), others (self only)';

comment on policy "leads_update_policy" on public.leads is
'Universal update policy: admin (any), others (self only)';

comment on policy "leads_delete_policy" on public.leads is
'Universal delete policy: admin (any), others (self only)';

-- =============================================================================
-- TEMPLATE INSTRUCTIONS (Comment out when using this template)
-- =============================================================================

/*
TO USE THIS TEMPLATE FOR A NEW USER-OWNED TABLE:

1. Replace "leads" with your table name throughout
2. Replace the business-specific fields with your table's fields
3. Keep the owner_user_id, created_at, updated_at fields
4. Keep all the RLS policies exactly as they are (universal pattern)
5. Update the indexes to match your table's query patterns
6. Add any additional business-specific indexes needed

EXAMPLE TABLE NAMES TO IMPLEMENT:
- activities (owner_user_id, activity_type, description, date, etc.)
- notes (owner_user_id, title, content, category, etc.)
- email_history (owner_user_id, recipient, subject, sent_at, etc.)
- client_interactions (owner_user_id, client_id, interaction_type, etc.)
- performance_metrics (owner_user_id, metric_type, value, period, etc.)

The RLS policies will automatically work for all these tables without modification!
*/