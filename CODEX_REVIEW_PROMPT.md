# Codex review prompt

Please review this Future Plus counselling MVP repository for production readiness before GitHub and Vercel deployment.

Focus on:

1. Next.js App Router correctness.
2. Supabase SSR Auth flow and middleware session refresh.
3. Supabase Row Level Security policies.
4. Staff domain restriction for `@omnexagoc.com`.
5. Server actions for student intake and admin course creation.
6. Recommendation scoring logic in `lib/recommendation.ts`.
7. TypeScript strict-mode errors.
8. Vercel deployment compatibility.
9. Any security issue around environment variables, service keys, staff-only hidden notes or student PII.
10. Simple UI/UX improvements without adding unnecessary complexity.

Please propose changes as a clear patch. Keep the MVP simple and deployable.
