-- Future Plus Admissions Counselling MVP
-- Run this in Supabase SQL Editor before deploying the app.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('staff', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.partner_status as enum ('preferred_partner', 'pipeline_partner', 'non_partner');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.student_status as enum ('lead', 'counselling', 'shortlisted', 'applied', 'admitted', 'onboarded', 'closed');
exception when duplicate_object then null;
end $$;

create or replace function public.is_omnexa_staff()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) like '%@omnexagoc.com';
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'staff',
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  future_plus_id text unique,
  status public.student_status not null default 'lead',
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  grade text,
  board text,
  city text,
  state text,
  country text default 'India',
  desired_program_level text not null default 'undergraduate',
  target_intake text,
  subjects_interest text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  budget_min numeric,
  budget_max numeric,
  salary_expectation numeric,
  hostel_required boolean not null default false,
  passion text,
  purpose text,
  strengths text,
  constraints text,
  support_required text[] not null default '{}',
  notes text,
  score numeric,
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  country text default 'India',
  partner_status public.partner_status not null default 'non_partner',
  commission_based boolean not null default false,
  hostel_available boolean default false,
  notes text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint colleges_unique_name_location unique (name, city, state)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  course_name text not null,
  subject_area text not null,
  duration text,
  total_fee numeric,
  placement_count int,
  highest_package numeric,
  average_package numeric,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_unique_college_course unique (college_id, course_name)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  fit_score numeric not null,
  rank int not null,
  score_breakdown jsonb not null default '{}'::jsonb,
  reason text not null,
  staff_hidden_reason text,
  created_at timestamptz not null default now(),
  constraint recommendations_student_rank unique (student_id, rank)
);

create sequence if not exists public.future_plus_id_seq start 1001;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_future_plus_id()
returns trigger
language plpgsql
as $$
begin
  if new.future_plus_id is null and new.status in ('admitted', 'onboarded') then
    new.future_plus_id := 'FP-UG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.future_plus_id_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, allowed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    lower(coalesce(new.email, '')) like '%@omnexagoc.com'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    allowed = excluded.allowed,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

drop trigger if exists set_colleges_updated_at on public.colleges;
create trigger set_colleges_updated_at before update on public.colleges
  for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists assign_future_plus_id_students on public.students;
create trigger assign_future_plus_id_students before insert or update on public.students
  for each row execute function public.generate_future_plus_id();

create or replace view public.course_catalog_view with (security_invoker = true) as
select
  courses.id as course_id,
  courses.course_name,
  courses.subject_area,
  courses.duration,
  courses.total_fee,
  courses.placement_count,
  courses.highest_package,
  courses.average_package,
  courses.currency,
  colleges.id as college_id,
  colleges.name as college_name,
  colleges.city,
  colleges.state,
  colleges.country,
  colleges.hostel_available,
  colleges.partner_status,
  colleges.commission_based,
  colleges.source_url
from public.courses
join public.colleges on colleges.id = courses.college_id;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.colleges enable row level security;
alter table public.courses enable row level security;
alter table public.recommendations enable row level security;

-- Staff policies. For production, replace domain-only approval with explicit profile.allowed + admin workflow.
drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_omnexa_staff());

drop policy if exists "staff read students" on public.students;
create policy "staff read students" on public.students for select to authenticated using (public.is_omnexa_staff());

drop policy if exists "staff insert students" on public.students;
create policy "staff insert students" on public.students for insert to authenticated with check (public.is_omnexa_staff());

drop policy if exists "staff update students" on public.students;
create policy "staff update students" on public.students for update to authenticated using (public.is_omnexa_staff()) with check (public.is_omnexa_staff());

drop policy if exists "staff read colleges" on public.colleges;
create policy "staff read colleges" on public.colleges for select to authenticated using (public.is_omnexa_staff());

drop policy if exists "staff insert colleges" on public.colleges;
create policy "staff insert colleges" on public.colleges for insert to authenticated with check (public.is_omnexa_staff());

drop policy if exists "staff update colleges" on public.colleges;
create policy "staff update colleges" on public.colleges for update to authenticated using (public.is_omnexa_staff()) with check (public.is_omnexa_staff());

drop policy if exists "staff read courses" on public.courses;
create policy "staff read courses" on public.courses for select to authenticated using (public.is_omnexa_staff());

drop policy if exists "staff insert courses" on public.courses;
create policy "staff insert courses" on public.courses for insert to authenticated with check (public.is_omnexa_staff());

drop policy if exists "staff update courses" on public.courses;
create policy "staff update courses" on public.courses for update to authenticated using (public.is_omnexa_staff()) with check (public.is_omnexa_staff());

drop policy if exists "staff read recommendations" on public.recommendations;
create policy "staff read recommendations" on public.recommendations for select to authenticated using (public.is_omnexa_staff());

drop policy if exists "staff insert recommendations" on public.recommendations;
create policy "staff insert recommendations" on public.recommendations for insert to authenticated with check (public.is_omnexa_staff());
