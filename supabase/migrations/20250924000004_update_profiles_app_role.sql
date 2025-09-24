-- Update profiles table to use proper app_role enum
-- This migration converts the existing text field to a proper enum type

-- Create the app_role enum type
create type public.app_role_type as enum ('admin', 'manager', 'staff', 'advisor', 'candidate');

-- Update the profiles table to use the enum
-- First, ensure any existing data can be converted
update public.profiles
set app_role = 'advisor'
where app_role is null or app_role = '';

-- Change the column type to use the enum
alter table public.profiles
alter column app_role type app_role_type using app_role::app_role_type;

-- Set a default value for new profiles
alter table public.profiles
alter column app_role set default 'advisor';

-- Add constraint to ensure app_role is never null
alter table public.profiles
alter column app_role set not null;

-- Add index for performance on role-based queries
create index idx_profiles_app_role on public.profiles using btree (app_role);