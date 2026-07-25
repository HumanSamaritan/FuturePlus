# Safe update, branch and rollback guide

## 1. Create a branch for these changes

```bash
git switch main
git pull
git switch -c feature/future-plus-ecosystem
git add .
git commit -m "Build Future Plus public site and staff ecosystem"
git push -u origin feature/future-plus-ecosystem
```

Open GitHub, create a pull request from `feature/future-plus-ecosystem` into `main`, and use the Vercel preview link to test before merging.

## 2. Database update

In Supabase SQL Editor, run `supabase/migrations/003_ecosystem_fields_and_reviews.sql` once. Set `FUTURE_PLUS_STAFF_EMAILS` in both `.env.local` and Vercel as a comma-separated list of approved employee emails.

Approve each employee in Supabase after their first Google sign-in:

```sql
update public.profiles set allowed = true, role = 'staff'
where email = 'employee@futureplusedus.com';
```

To generate annual review emails, schedule this SQL function daily using Supabase Cron:

```sql
select public.queue_due_college_reviews('admin@futureplusedus.com');
```

The function creates records in `review_email_queue`. Connect that queue to your email provider or a Vercel scheduled function for delivery.

## 3. Roll back safely

If the preview has issues, do not merge the pull request. If it was already merged, use GitHub’s **Revert** button on the merge commit and deploy the resulting revert commit. The migration only adds fields/tables, so the earlier application version continues to work without deleting data.
