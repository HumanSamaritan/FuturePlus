-- Reliable deletion requests and Super User recognition.
create or replace function public.is_future_plus_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid() and allowed=true and role='admin'
  ) or exists(
    select 1 from public.staff_access
    where lower(email)=lower(coalesce(auth.jwt()->>'email',''))
      and active=true and role='admin'
  );
$$;

create or replace function public.is_omnexa_staff()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid() and allowed=true and role in ('staff','admin')
  ) or exists(
    select 1 from public.staff_access
    where lower(email)=lower(coalesce(auth.jwt()->>'email',''))
      and active=true and role in ('staff','admin')
  );
$$;

create or replace function public.submit_deletion_request(
  p_target_type text,
  p_target_id uuid,
  p_program_level text,
  p_target_name text
) returns uuid
language plpgsql security definer set search_path=public as $$
declare request_id uuid;
begin
  if not public.is_omnexa_staff() then
    raise exception 'Approved staff access is required.';
  end if;
  if p_target_type not in ('student','university_programme') then
    raise exception 'Invalid deletion target type.';
  end if;
  if p_target_type='university_programme'
     and p_program_level not in ('undergraduate','postgraduate') then
    raise exception 'Programme level is required.';
  end if;
  if exists(
    select 1 from public.deletion_requests
    where target_type=p_target_type
      and target_id=p_target_id
      and coalesce(program_level,'')=coalesce(p_program_level,'')
      and status='pending'
  ) then
    raise exception 'A pending deletion request already exists for this record.';
  end if;
  insert into public.deletion_requests(
    target_type,target_id,program_level,target_name,
    requested_by,requested_by_email
  ) values (
    p_target_type,p_target_id,p_program_level,p_target_name,
    auth.uid(),auth.jwt()->>'email'
  ) returning id into request_id;
  return request_id;
end;
$$;

revoke all on function public.submit_deletion_request(text,uuid,text,text) from public;
grant execute on function public.submit_deletion_request(text,uuid,text,text) to authenticated;
grant execute on function public.is_future_plus_admin() to authenticated;
