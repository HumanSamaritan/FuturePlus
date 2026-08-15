-- Keep the repository migration history aligned with the approved Supabase changes.

alter table public.students
  add column if not exists international_college_insights jsonb not null default '[]'::jsonb,
  add column if not exists international_discovery_status jsonb;

-- Correct catalogue-level programme contamination defensively.
update public.courses
set program_level = 'postgraduate'
where lower(coalesce(course_name, '')) ~ '(^|[^a-z])(mba|pgdm|pgpm|m\.tech|mtech|m\.sc|msc|m\.com|mcom|ll\.m|llm|m\.pharm|mpharm)([^a-z]|$)'
  and program_level = 'undergraduate';

drop policy if exists "staff update recommendations" on public.recommendations;
create policy "staff update recommendations"
on public.recommendations
for update
to authenticated
using (
  exists (
    select 1 from public.students
    where students.id = recommendations.student_id
      and (students.created_by = auth.uid() or is_future_plus_admin())
  )
)
with check (
  exists (
    select 1 from public.students
    where students.id = recommendations.student_id
      and (students.created_by = auth.uid() or is_future_plus_admin())
  )
);

drop policy if exists "staff delete recommendations" on public.recommendations;
create policy "staff delete recommendations"
on public.recommendations
for delete
to authenticated
using (
  exists (
    select 1 from public.students
    where students.id = recommendations.student_id
      and (students.created_by = auth.uid() or is_future_plus_admin())
  )
);
