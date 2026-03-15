-- ============================================================
-- RecruitOS — Full Database Schema
-- Paste this into Supabase SQL Editor and click Run
-- ============================================================

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'Prospect' check (status in ('Prospect', 'Client')),
  website text,
  industry text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- Company contacts
create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  linkedin text,
  created_at timestamptz not null default now()
);

-- Candidates
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  linkedin text,
  current_title text,
  current_company text,
  current_company_url text,
  time_in_current_role text,
  previous_title text,
  previous_company text,
  previous_dates text,
  tags text[] default '{}',
  source_list text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  salary_min integer,
  salary_max integer,
  location text,
  status text not null default 'Active' check (status in ('Active', 'On Hold', 'Filled', 'Cancelled')),
  company_id uuid not null references public.companies(id) on delete restrict,
  contact_id uuid references public.company_contacts(id),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- Pipeline (Candidate <-> Job join table with stage)
create table if not exists public.pipeline (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  stage text not null default 'Prescreen Scheduled' check (stage in (
    'Prescreen Scheduled',
    'Prescreen Complete',
    'Resume Received',
    'Candidate Submitted',
    'Interview Requested',
    'Interview Scheduled',
    'Offer Extended',
    'Offer Accepted',
    'Started - Send Invoice'
  )),
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles(id),
  unique(candidate_id, job_id)
);

-- Activities / Notes feed
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  type text not null default 'note' check (type in (
    'note', 'called', 'voicemail', 'emailed', 'linkedin', 'texted', 'stage_change', 'added'
  )),
  content text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_by_name text not null default ''
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_contacts enable row level security;
alter table public.candidates enable row level security;
alter table public.jobs enable row level security;
alter table public.pipeline enable row level security;
alter table public.activities enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_locked = false
  );
$$;

-- Helper: is the current user active (not locked)?
create or replace function public.is_active_user()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_locked = false
  );
$$;

-- Profiles: users can read all profiles, only admins can update roles/lock status
create policy "Active users can read profiles" on public.profiles
  for select using (public.is_active_user());

create policy "Users can update own profile name" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile" on public.profiles
  for update using (public.is_admin());

-- Companies: all active users read, write; only admins delete
create policy "Active users read companies" on public.companies
  for select using (public.is_active_user());
create policy "Active users insert companies" on public.companies
  for insert with check (public.is_active_user());
create policy "Active users update companies" on public.companies
  for update using (public.is_active_user());
create policy "Admins delete companies" on public.companies
  for delete using (public.is_admin());

-- Company contacts
create policy "Active users read contacts" on public.company_contacts
  for select using (public.is_active_user());
create policy "Active users insert contacts" on public.company_contacts
  for insert with check (public.is_active_user());
create policy "Active users update contacts" on public.company_contacts
  for update using (public.is_active_user());
create policy "Admins delete contacts" on public.company_contacts
  for delete using (public.is_admin());

-- Candidates
create policy "Active users read candidates" on public.candidates
  for select using (public.is_active_user());
create policy "Active users insert candidates" on public.candidates
  for insert with check (public.is_active_user());
create policy "Active users update candidates" on public.candidates
  for update using (public.is_active_user());
create policy "Admins delete candidates" on public.candidates
  for delete using (public.is_admin());

-- Jobs
create policy "Active users read jobs" on public.jobs
  for select using (public.is_active_user());
create policy "Active users insert jobs" on public.jobs
  for insert with check (public.is_active_user());
create policy "Active users update jobs" on public.jobs
  for update using (public.is_active_user());
create policy "Admins delete jobs" on public.jobs
  for delete using (public.is_admin());

-- Pipeline
create policy "Active users read pipeline" on public.pipeline
  for select using (public.is_active_user());
create policy "Active users insert pipeline" on public.pipeline
  for insert with check (public.is_active_user());
create policy "Active users update pipeline" on public.pipeline
  for update using (public.is_active_user());
create policy "Admins delete pipeline" on public.pipeline
  for delete using (public.is_admin());

-- Activities (no delete for anyone except admins — audit trail)
create policy "Active users read activities" on public.activities
  for select using (public.is_active_user());
create policy "Active users insert activities" on public.activities
  for insert with check (public.is_active_user());
create policy "Admins delete activities" on public.activities
  for delete using (public.is_admin());

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
