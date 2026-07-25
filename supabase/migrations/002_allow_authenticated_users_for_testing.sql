-- Future Plus development/testing access update
-- Run this once in the Supabase SQL Editor for an existing project that has
-- already applied 001_initial_schema.sql.

create or replace function public.is_omnexa_staff()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
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
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    allowed = true,
    updated_at = now();
  return new;
end;
$$;

update public.profiles
set allowed = true,
    updated_at = now()
where allowed = false;
