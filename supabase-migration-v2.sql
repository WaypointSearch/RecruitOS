-- RecruitOS v2 Migration
-- Run this in Supabase SQL Editor AFTER the original schema

alter table public.candidates add column if not exists location text;
alter table public.candidates add column if not exists work_phone text;
alter table public.candidates add column if not exists cell_phone text;
alter table public.candidates add column if not exists work_email text;
alter table public.candidates add column if not exists personal_email text;
alter table public.candidates add column if not exists current_salary integer;

alter table public.companies add column if not exists location text;
alter table public.companies add column if not exists corporate_phone text;
alter table public.companies add column if not exists local_phone text;

alter table public.company_contacts add column if not exists notes text;
alter table public.pipeline add column if not exists last_moved_at timestamptz default now();

create table if not exists public.company_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null default 'note',
  content text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_by_name text not null default ''
);

alter table public.company_activities enable row level security;

create policy "Active users read company_activities" on public.company_activities
  for select using (public.is_active_user());
create policy "Active users insert company_activities" on public.company_activities
  for insert with check (public.is_active_user());
create policy "Admins delete company_activities" on public.company_activities
  for delete using (public.is_admin());
