-- Staff/Super User access control and postgraduate intake support.
create table if not exists public.staff_access (
  email text primary key,
  full_name text,
  role public.user_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Configure after applying:
-- insert into public.staff_access (email, full_name, role) values
-- ('admin@futureplusedus.com','Future Plus Admin','admin'),
-- ('counsellor@futureplusedus.com','Counsellor Name','staff')
-- on conflict (email) do update set full_name=excluded.full_name, role=excluded.role, active=true;

create or replace function public.sync_my_profile_access()
returns public.user_role language plpgsql security definer set search_path = public as $$
declare login_email text; access_record public.staff_access%rowtype;
begin
  login_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into access_record from public.staff_access
  where lower(email)=login_email and active=true;
  if access_record.email is null then raise exception 'This email is not configured in staff_access'; end if;
  insert into public.profiles (id,email,full_name,role,allowed)
  values (auth.uid(),login_email,
    coalesce(access_record.full_name,auth.jwt()->'user_metadata'->>'full_name',auth.jwt()->'user_metadata'->>'name'),
    access_record.role,true)
  on conflict (id) do update set email=excluded.email,
    full_name=coalesce(excluded.full_name,profiles.full_name),role=excluded.role,allowed=true,updated_at=now();
  return access_record.role;
end; $$;

create or replace function public.is_future_plus_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and allowed=true and role='admin');
$$;

create or replace function public.is_omnexa_staff()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and allowed=true and role in ('staff','admin'));
$$;

alter table public.staff_access enable row level security;
drop policy if exists "admins manage staff access" on public.staff_access;
create policy "admins manage staff access" on public.staff_access for all to authenticated
using (public.is_future_plus_admin()) with check (public.is_future_plus_admin());

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select to authenticated
using (id=auth.uid() or public.is_future_plus_admin());

drop policy if exists "staff read students" on public.students;
create policy "staff read students" on public.students for select to authenticated
using (created_by=auth.uid() or public.is_future_plus_admin());
drop policy if exists "staff insert students" on public.students;
create policy "staff insert students" on public.students for insert to authenticated
with check ((created_by=auth.uid() and public.is_omnexa_staff()) or public.is_future_plus_admin());
drop policy if exists "staff update students" on public.students;
create policy "staff update students" on public.students for update to authenticated
using (created_by=auth.uid() or public.is_future_plus_admin())
with check (created_by=auth.uid() or public.is_future_plus_admin());

drop policy if exists "staff read recommendations" on public.recommendations;
create policy "staff read recommendations" on public.recommendations for select to authenticated
using (exists(select 1 from public.students where students.id=recommendations.student_id
  and (students.created_by=auth.uid() or public.is_future_plus_admin())));
drop policy if exists "staff insert recommendations" on public.recommendations;
create policy "staff insert recommendations" on public.recommendations for insert to authenticated
with check (exists(select 1 from public.students where students.id=recommendations.student_id
  and (students.created_by=auth.uid() or public.is_future_plus_admin())));

alter table public.students add column if not exists undergraduate_degree text;
alter table public.students add column if not exists undergraduate_specialisation text;
alter table public.students add column if not exists undergraduate_university text;
alter table public.students add column if not exists undergraduate_graduation_year integer;
alter table public.students add column if not exists pg_applicant_status text;
alter table public.students add column if not exists semesters_completed integer;
alter table public.students add column if not exists semester_marks jsonb not null default '{}'::jsonb;
alter table public.students add column if not exists undergraduate_final_percentage numeric(5,2);
alter table public.students add column if not exists current_employer text;
alter table public.students add column if not exists current_job_title text;
alter table public.students add column if not exists work_experience_months integer;
alter table public.students drop constraint if exists students_pg_applicant_status_check;
alter table public.students add constraint students_pg_applicant_status_check
check (pg_applicant_status is null or pg_applicant_status in ('final_semester','passed_out','working_professional'));
alter table public.students drop constraint if exists students_undergraduate_final_percentage_check;
alter table public.students add constraint students_undergraduate_final_percentage_check
check (undergraduate_final_percentage is null or undergraduate_final_percentage between 0 and 100);

alter table public.courses add column if not exists program_level text not null default 'undergraduate';
alter table public.courses drop constraint if exists courses_program_level_check;
alter table public.courses add constraint courses_program_level_check
check (program_level in ('undergraduate','postgraduate'));

create or replace view public.course_catalog_view with (security_invoker=true) as
select courses.id course_id,courses.course_name,courses.subject_area,courses.duration,courses.total_fee,
courses.placement_count,courses.highest_package,courses.average_package,courses.currency,
colleges.id college_id,colleges.name college_name,colleges.city,colleges.state,colleges.country,
colleges.hostel_available,colleges.partner_status,colleges.commission_based,colleges.source_url,
colleges.poc_name,colleges.poc_email,colleges.next_review_at,courses.program_level
from public.courses join public.colleges on colleges.id=courses.college_id;
