-- Track the staff member responsible for each student lead.
alter table public.students add column if not exists assigned_staff_name text;
alter table public.students add column if not exists assigned_staff_email text;

update public.students as students
set
  assigned_staff_name = coalesce(students.assigned_staff_name, profiles.full_name),
  assigned_staff_email = coalesce(students.assigned_staff_email, profiles.email)
from public.profiles as profiles
where students.created_by = profiles.id
  and (students.assigned_staff_name is null or students.assigned_staff_email is null);

create index if not exists students_assigned_staff_email_idx
  on public.students (assigned_staff_email);

create index if not exists students_created_by_idx
  on public.students (created_by);
