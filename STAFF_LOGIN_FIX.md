# Staff login fix

The earlier message incorrectly described every allowlist failure as a missing Google email. The application now reports whether the allowlist is missing or the selected address is not approved.

## Vercel configuration

1. Open the Future Plus project in Vercel.
2. Open **Settings → Environment Variables**.
3. Add `FUTURE_PLUS_STAFF_EMAILS`.
4. Enter approved Google addresses separated by commas, for example:

```text
dhiraj.kums@gmail.com,employee@futureplusedus.com
```

To allow every verified account belonging to the Future Plus domain, add:

```text
*@futureplusedus.com
```

5. Enable the variable for Production, Preview and Development.
6. Save it and redeploy the latest deployment.

## Supabase approval

After the employee signs in once, approve the same address in Supabase SQL Editor:

```sql
update public.profiles
set allowed = true, role = 'staff'
where lower(email) = lower('dhiraj.kums@gmail.com');
```

If no row is updated, ask the employee to sign in once, then run the query again.
