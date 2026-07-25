-- Add structured Class X and XII academic history to student intake records.
alter table public.students add column if not exists year_x integer;
alter table public.students add column if not exists marks_x numeric(5,2);
alter table public.students add column if not exists year_xii integer;
alter table public.students add column if not exists marks_xii numeric(5,2);

alter table public.students drop constraint if exists students_year_x_check;
alter table public.students add constraint students_year_x_check
  check (year_x is null or year_x between 1950 and 2100);

alter table public.students drop constraint if exists students_year_xii_check;
alter table public.students add constraint students_year_xii_check
  check (year_xii is null or year_xii between 1950 and 2100);

alter table public.students drop constraint if exists students_marks_x_check;
alter table public.students add constraint students_marks_x_check
  check (marks_x is null or marks_x between 0 and 100);

alter table public.students drop constraint if exists students_marks_xii_check;
alter table public.students add constraint students_marks_xii_check
  check (marks_xii is null or marks_xii between 0 and 100);
