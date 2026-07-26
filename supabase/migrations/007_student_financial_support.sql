-- Mandatory student support preferences and an automatic financial-aid flag.
alter table public.students
  add column if not exists loan_required boolean not null default false,
  add column if not exists below_poverty_line boolean not null default false,
  add column if not exists financial_aid_required boolean not null default false;

-- Existing and future records stay consistent: a below-poverty-line student
-- must always carry the financial-aid-required flag.
update public.students
set financial_aid_required = below_poverty_line
where financial_aid_required is distinct from below_poverty_line;

create or replace function public.set_student_financial_aid_flag()
returns trigger
language plpgsql
as $$
begin
  new.financial_aid_required := new.below_poverty_line;
  return new;
end;
$$;

drop trigger if exists students_financial_aid_flag on public.students;
create trigger students_financial_aid_flag
before insert or update of below_poverty_line on public.students
for each row execute function public.set_student_financial_aid_flag();
