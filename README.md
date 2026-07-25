# Future Plus Counselling MVP

A deployable MVP for undergraduate admissions counselling using **Next.js**, **Supabase Auth**, **Supabase Postgres**, and **Vercel**.

## What this MVP does

- Staff login using Google OAuth through Supabase.
- Access restricted to `@omnexagoc.com` staff email addresses.
- Student intake form for undergraduate counselling.
- Captures passion, purpose, budget, salary expectation, hostel need, subjects, preferred location and Future Plus support required.
- Stores student records in Supabase.
- Stores college, course, fee, placement, hostel and partner/commission flags.
- Generates transparent best-fit recommendations with a score out of 100.
- Gives preference to Future Plus partner colleges, while still showing high-performing non-partner colleges in a staff-only note.
- Generates a Future Plus ID when student status is changed to `admitted` or `onboarded`.

## Tech stack

- Next.js App Router
- TypeScript
- Supabase Auth with Google OAuth
- Supabase Postgres with Row Level Security
- Vercel deployment
- Optional OpenAI Responses API for counselling summary text

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/migrations/001_initial_schema.sql`.
4. Run `supabase/seed.sql` for sample data.
5. Go to **Authentication > Providers > Google** and enable Google.
6. Add your Google OAuth client ID and secret.
7. Add redirect URLs:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://YOUR-VERCEL-DOMAIN/auth/callback`
8. Copy Supabase project URL and publishable key into `.env.local`.

## Vercel environment variables

Add these in Vercel Project Settings > Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
ALLOWED_STAFF_DOMAIN=omnexagoc.com
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` is optional. Without it, the app uses a rule-based counselling summary.

## Deploy

```bash
git init
git add .
git commit -m "Initial Future Plus counselling MVP"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Then import the GitHub repository into Vercel and set the environment variables above.

## Important production notes

1. The current MVP restricts staff access by email domain. For production, add an explicit admin approval workflow using `profiles.allowed = true`.
2. College data must be verified before final counselling advice. The seed data is sample data only.
3. The MVP does not scrape the live web. The recommended production pattern is a verified college ingestion pipeline with source URLs, last-verified timestamps and admin approval.
4. The fit score is transparent and rule-based. Keep this approach for auditability, then use AI only to improve explanation quality, not to invent data.
5. Do not put Supabase secret keys or service-role keys in browser-exposed environment variables.

## Suggested next build phase

- CSV upload for partner colleges.
- Admin approval for staff users.
- Last-verified date for every fee and placement field.
- Partner CRM workflow.
- Student communication templates.
- Postgraduate programme module.
