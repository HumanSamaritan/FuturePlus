-- Future Plus ecosystem fields, controlled staff access and annual review queue.
create or replace function public.is_omnexa_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and allowed = true and role in ('staff', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, allowed)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), false)
  on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, updated_at = now();
  return new;
end;
$$;

alter table public.students add column if not exists linkedin_url text;
alter table public.students add column if not exists facebook_url text;
alter table public.students add column if not exists instagram_url text;
alter table public.students add column if not exists x_url text;
alter table public.students add column if not exists portfolio_url text;
alter table public.students add column if not exists accolades text;
alter table public.students add column if not exists extracurricular_activities text;
alter table public.students add column if not exists rewards text;
alter table public.students add column if not exists special_skills text;
alter table public.students add column if not exists certifications text;
alter table public.students add column if not exists languages text;
alter table public.students add column if not exists work_experience text;
alter table public.students add column if not exists career_goals text;

alter table public.colleges add column if not exists poc_name text;
alter table public.colleges add column if not exists poc_email text;
alter table public.colleges add column if not exists last_reviewed_at timestamptz;
alter table public.colleges add column if not exists next_review_at timestamptz;
alter table public.colleges add column if not exists review_status text not null default 'due';

create or replace function public.schedule_college_review()
returns trigger language plpgsql as $$
begin
  if new.last_reviewed_at is distinct from old.last_reviewed_at or new.next_review_at is null then
    new.next_review_at := coalesce(new.last_reviewed_at, now()) + interval '1 year';
    new.review_status := 'scheduled';
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_college_review_trigger on public.colleges;
create trigger schedule_college_review_trigger before insert or update on public.colleges
for each row execute function public.schedule_college_review();

create table if not exists public.review_email_queue (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (college_id, scheduled_for)
);

alter table public.review_email_queue enable row level security;
create policy "staff manage review queue" on public.review_email_queue for all to authenticated
using (public.is_omnexa_staff()) with check (public.is_omnexa_staff());

create or replace view public.course_catalog_view with (security_invoker = true) as
select
  courses.id as course_id, courses.course_name, courses.subject_area, courses.duration,
  courses.total_fee, courses.placement_count, courses.highest_package, courses.average_package,
  courses.currency, colleges.id as college_id, colleges.name as college_name, colleges.city,
  colleges.state, colleges.country, colleges.hostel_available, colleges.partner_status,
  colleges.commission_based, colleges.source_url, colleges.poc_name, colleges.poc_email,
  colleges.next_review_at
from public.courses
join public.colleges on colleges.id = courses.college_id;

-- Run daily from Supabase Cron (or a Vercel cron endpoint) to generate review emails.
create or replace function public.queue_due_college_reviews(admin_email text)
returns integer language plpgsql security definer set search_path = public as $$
declare queued integer;
begin
  insert into public.review_email_queue (college_id, recipient_email, subject, body, scheduled_for)
  select id, admin_email,
    'Annual college data review: ' || name,
    'Please review and update the college record, POC, courses, fees and placement data for ' || name || '.',
    next_review_at
  from public.colleges
  where next_review_at <= now() and review_status <> 'queued'
  on conflict do nothing;
  get diagnostics queued = row_count;
  update public.colleges set review_status = 'queued' where next_review_at <= now();
  return queued;
end;
$$;
