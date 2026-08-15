alter table public.students
  add column if not exists linkedin_profile_pdf_path text,
  add column if not exists linkedin_profile_pdf_name text,
  add column if not exists linkedin_profile_pdf_text text,
  add column if not exists resume_text text,
  add column if not exists resume_file_path text,
  add column if not exists resume_file_name text,
  add column if not exists resume_file_text text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-documents','student-documents',false,5242880,array['application/pdf','text/plain']::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf','text/plain']::text[];

drop policy if exists "staff read owned student documents" on storage.objects;
create policy "staff read owned student documents" on storage.objects for select to authenticated
using (bucket_id='student-documents' and exists (
  select 1 from public.students s where s.id::text=(storage.foldername(name))[1]
    and (s.created_by=auth.uid() or public.is_future_plus_admin())
));

drop policy if exists "staff upload owned student documents" on storage.objects;
create policy "staff upload owned student documents" on storage.objects for insert to authenticated
with check (bucket_id='student-documents' and exists (
  select 1 from public.students s where s.id::text=(storage.foldername(name))[1]
    and (s.created_by=auth.uid() or public.is_future_plus_admin())
));

drop policy if exists "staff update owned student documents" on storage.objects;
create policy "staff update owned student documents" on storage.objects for update to authenticated
using (bucket_id='student-documents' and exists (
  select 1 from public.students s where s.id::text=(storage.foldername(name))[1]
    and (s.created_by=auth.uid() or public.is_future_plus_admin())
))
with check (bucket_id='student-documents' and exists (
  select 1 from public.students s where s.id::text=(storage.foldername(name))[1]
    and (s.created_by=auth.uid() or public.is_future_plus_admin())
));

drop policy if exists "staff delete owned student documents" on storage.objects;
create policy "staff delete owned student documents" on storage.objects for delete to authenticated
using (bucket_id='student-documents' and exists (
  select 1 from public.students s where s.id::text=(storage.foldername(name))[1]
    and (s.created_by=auth.uid() or public.is_future_plus_admin())
));

create or replace function public.mark_student_ai_profile_dirty()
returns trigger language plpgsql as $$
begin
  if new.desired_program_level is distinct from old.desired_program_level
    or new.year_x is distinct from old.year_x
    or new.marks_x is distinct from old.marks_x
    or new.year_xii is distinct from old.year_xii
    or new.marks_xii is distinct from old.marks_xii
    or new.board is distinct from old.board
    or new.subjects_interest is distinct from old.subjects_interest
    or new.preferred_locations is distinct from old.preferred_locations
    or new.passion is distinct from old.passion
    or new.purpose is distinct from old.purpose
    or new.strengths is distinct from old.strengths
    or new.constraints is distinct from old.constraints
    or new.career_goals is distinct from old.career_goals
    or new.linkedin_url is distinct from old.linkedin_url
    or new.linkedin_profile_text is distinct from old.linkedin_profile_text
    or new.linkedin_profile_pdf_text is distinct from old.linkedin_profile_pdf_text
    or new.facebook_url is distinct from old.facebook_url
    or new.instagram_url is distinct from old.instagram_url
    or new.x_url is distinct from old.x_url
    or new.portfolio_url is distinct from old.portfolio_url
    or new.accolades is distinct from old.accolades
    or new.extracurricular_activities is distinct from old.extracurricular_activities
    or new.rewards is distinct from old.rewards
    or new.special_skills is distinct from old.special_skills
    or new.certifications is distinct from old.certifications
    or new.languages is distinct from old.languages
    or new.work_experience is distinct from old.work_experience
    or new.resume_text is distinct from old.resume_text
    or new.resume_file_text is distinct from old.resume_file_text
    or new.undergraduate_degree is distinct from old.undergraduate_degree
    or new.undergraduate_specialisation is distinct from old.undergraduate_specialisation
    or new.undergraduate_university is distinct from old.undergraduate_university
    or new.undergraduate_graduation_year is distinct from old.undergraduate_graduation_year
    or new.pg_applicant_status is distinct from old.pg_applicant_status
    or new.semesters_completed is distinct from old.semesters_completed
    or new.semester_marks is distinct from old.semester_marks
    or new.undergraduate_final_percentage is distinct from old.undergraduate_final_percentage
    or new.current_employer is distinct from old.current_employer
    or new.current_job_title is distinct from old.current_job_title
    or new.work_experience_months is distinct from old.work_experience_months
  then
    new.ai_profile_dirty := true;
  elsif new.ai_summary is distinct from old.ai_summary then
    new.ai_profile_dirty := false;
  end if;
  return new;
end;
$$;
