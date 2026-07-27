# Future Plus authentication update

## Required one-time Supabase step

For a Supabase project that already ran `001_initial_schema.sql`:

1. Open the Supabase Dashboard.
2. Select the Future Plus project.
3. Open **SQL Editor**.
4. Open `supabase/migrations/002_allow_authenticated_users_for_testing.sql`
   from this package.
5. Copy the complete SQL into a new query.
6. Click **Run** and confirm that it completes successfully.

This development/testing migration permits any authenticated Google user. It does
not make the database public; unauthenticated requests remain blocked by RLS.

## Deploy the updated application

1. Replace the project files in the GitHub repository with this version.
2. Commit and push the changes to the production branch.
3. Confirm these Vercel environment variables are present:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `AI_PROVIDERS` (for example: `groq,gemini,openrouter,deepseek`)
   - A server-only key for every enabled provider, such as `GROQ_API_KEY`,
     `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and `DEEPSEEK_API_KEY`
   - The matching optional model variables: `GROQ_MODEL`, `GEMINI_MODEL`,
     `OPENROUTER_MODEL`, and `DEEPSEEK_MODEL`
4. Redeploy in Vercel without the previous build cache.
5. In Supabase **Authentication > URL Configuration**, confirm the exact
   production URL ending in `/auth/callback` is listed.
6. Test in a private browser window.

See `AI_PROVIDER_SETUP.md` for key-generation instructions and alternative
Gemini, OpenRouter, and DeepSeek configurations. Existing `GEMINI_API_KEY` and
`GEMINI_MODEL` variables remain supported for backward compatibility.

The Google sign-in is initiated through `/auth/login`, which creates the PKCE
verifier on the server before redirecting to Google. The callback then exchanges
the returned code and writes the Supabase session cookie before opening the
dashboard.

## Production warning

Before opening the application to real users, replace testing access with an
explicit user approval or role-based authorization workflow.
