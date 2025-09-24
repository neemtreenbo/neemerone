create table public.profiles (
  user_id uuid not null,
  first_name text,
  last_name text,
  email text,
  app_role text,
  photo_url text,
  onboarding_completed boolean default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);