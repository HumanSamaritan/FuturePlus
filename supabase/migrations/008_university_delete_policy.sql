-- Two-stage deletion approval workflow for students and university programme rows.
create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('student','university_programme')),
  target_id uuid not null,
  program_level text check (program_level is null or program_level in ('undergraduate','postgraduate')),
  target_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_by uuid not null references auth.users(id),
  requested_by_email text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists deletion_requests_one_pending_target
on public.deletion_requests(target_type,target_id,coalesce(program_level,''))
where status='pending';
alter table public.deletion_requests enable row level security;
drop policy if exists "staff create deletion requests" on public.deletion_requests;
create policy "staff create deletion requests" on public.deletion_requests for insert to authenticated
with check (requested_by=auth.uid() and public.is_omnexa_staff());
drop policy if exists "staff view deletion requests" on public.deletion_requests;
create policy "staff view deletion requests" on public.deletion_requests for select to authenticated
using (requested_by=auth.uid() or public.is_future_plus_admin());
drop policy if exists "admins decide deletion requests" on public.deletion_requests;
create policy "admins decide deletion requests" on public.deletion_requests for update to authenticated
using (public.is_future_plus_admin()) with check (public.is_future_plus_admin());

drop policy if exists "staff delete courses" on public.courses;
drop policy if exists "admins delete courses" on public.courses;
create policy "admins delete courses"
on public.courses
for delete
to authenticated
using (public.is_future_plus_admin());

drop policy if exists "staff delete colleges" on public.colleges;
drop policy if exists "admins delete colleges" on public.colleges;
create policy "admins delete colleges"
on public.colleges
for delete
to authenticated
using (public.is_future_plus_admin());

drop policy if exists "admins delete students" on public.students;
create policy "admins delete students" on public.students for delete to authenticated
using (public.is_future_plus_admin());
