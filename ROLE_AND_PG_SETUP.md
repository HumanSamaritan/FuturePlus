# Staff, Super User and Postgraduate Setup

## 1. Apply database migrations

Apply these migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/004_student_academic_marks.sql`
2. `supabase/migrations/005_student_staff_ownership.sql`
3. `supabase/migrations/006_roles_and_postgraduate_flow.sql`

## 2. Configure Staff and Super User emails

Add every approved login to `public.staff_access`. The role controls data visibility.

```sql
insert into public.staff_access (email, full_name, role, active)
values
  ('admin@futureplusedus.com', 'Future Plus Admin', 'admin', true),
  ('counsellor@futureplusedus.com', 'Counsellor Name', 'staff', true)
on conflict (email) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  active = excluded.active,
  updated_at = now();
```

- `admin` is the Super User role and can see all staff leads.
- `staff` can see only leads where `created_by` matches the signed-in user.
- There is one Google login. The callback reads the signed-in email and synchronises the matching database role.

## 3. Configure deployment environment variables

```env
FUTURE_PLUS_STAFF_EMAILS=counsellor@futureplusedus.com,*@futureplusedus.com
FUTURE_PLUS_SUPER_USER_EMAILS=admin@futureplusedus.com
```

Super User emails may also appear in `FUTURE_PLUS_STAFF_EMAILS`; the database `staff_access.role` remains the source of truth for data visibility.

## 4. Add postgraduate courses

On **Imports & admin**, choose **Postgraduate** as the program level when adding MBA, MCA, M.Tech, M.Sc, M.Com, M.A, LL.M, M.Pharm or other PG courses. PG recommendations only use courses marked `postgraduate`.

The postgraduate intake page is:

```text
/students/postgraduate/new
```
