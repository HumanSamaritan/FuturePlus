# Future Plus AI provider setup

Future Plus can use Gemini, Groq, OpenRouter, and DeepSeek together. Every
configured provider is consulted in parallel, successful analyses are
consolidated into one AI Insights report, and an individual provider failure
does not prevent the other providers from completing. Keys stay on the server
and are never sent to a user's browser.

## Multi-model Vercel configuration

Add the providers you want under **Vercel > Future Plus > Settings >
Environment Variables**:

| Name | Example value |
| --- | --- |
| `AI_PROVIDERS` | `groq,gemini,openrouter,deepseek` |
| `GROQ_API_KEY` | the Groq key |
| `GROQ_MODEL` | `llama-3.1-8b-instant` |
| `GEMINI_API_KEY` | the Gemini key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `OPENROUTER_API_KEY` | the OpenRouter key |
| `OPENROUTER_MODEL` | `openrouter/free` |
| `DEEPSEEK_API_KEY` | the DeepSeek key |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` |

The order in `AI_PROVIDERS` controls which successful provider consolidates the
independent analyses. Only providers with an API key are called. To temporarily
disable one provider, remove its key or remove its name from `AI_PROVIDERS`,
then redeploy.

After saving, open **Deployments**, select the latest deployment and choose
**Redeploy**. Then open a student and select **Regenerate AI Insights**.

## Recommended starting setup: Groq with Llama

Groq is the simplest free-plan option for this application. Its free plan
currently includes Llama models with published request and token limits.

1. Go to https://console.groq.com and sign in.
2. Open **API Keys**: https://console.groq.com/keys.
3. Select **Create API Key**, name it `future-plus-vercel`, and copy it.
4. In Vercel, open the Future Plus project.
5. Open **Settings > Environment Variables**.
6. Add these variables:

   | Name | Value |
   | --- | --- |
   | `GROQ_API_KEY` | the copied Groq key |
   | `GROQ_MODEL` | `llama-3.1-8b-instant` |

7. Select **Production**, **Preview**, and **Development** if all environments
   should use the provider. At minimum, select **Production**.
8. Save the variables.
9. Open **Deployments**, select the latest deployment, and choose **Redeploy**.
   Environment changes do not alter an already-built deployment.
10. Open a student in Future Plus and select **Regenerate AI Insights**.

For a more capable but more restricted free-plan model, change `AI_MODEL` to
`llama-3.3-70b-versatile`. Groq's current exact limits should always be checked
on the account's Limits page before production use.

## Alternative A: Google Gemini free tier

1. Open Google AI Studio: https://aistudio.google.com/apikey.
2. Sign in, choose **Get API key**, select or create a Google Cloud project, and
   copy the key.
3. Add or replace these Vercel variables:

   | Name | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | the copied Gemini key |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |

4. Save and redeploy the Vercel project.

Google provides free-tier access to selected Gemini models subject to region,
model, and rate limits. Free-tier prompts and responses may be used by Google to
improve its products, which should be considered before sending real student
data.

Existing deployments using `GEMINI_API_KEY` and `GEMINI_MODEL` continue to work.

## Alternative B: OpenRouter free models

OpenRouter is useful for trying a rotating group of free models, including
open-weight families. Availability can vary, so this is better for testing or
as a backup than for a predictable production service.

1. Go to https://openrouter.ai/settings/keys and create an API key.
2. Add or replace these Vercel variables:

   | Name | Value |
   | --- | --- |
   | `OPENROUTER_API_KEY` | the copied OpenRouter key |
   | `OPENROUTER_MODEL` | `openrouter/free` |
   | `NEXT_PUBLIC_SITE_URL` | the production Future Plus URL |

3. Save and redeploy.

The free router chooses from currently available free models. For a specific
model, use its exact OpenRouter ID ending in `:free`. Accounts without purchased
credits currently receive a lower daily free-model request limit.

## Alternative C: DeepSeek

DeepSeek's official API is inexpensive but should not be treated as a permanent
free service. It bills tokens from topped-up or granted balance.

1. Create an account at https://platform.deepseek.com.
2. Create an API key in the platform's API keys section and copy it.
3. Add or replace these Vercel variables:

   | Name | Value |
   | --- | --- |
   | `DEEPSEEK_API_KEY` | the copied DeepSeek key |
   | `DEEPSEEK_MODEL` | `deepseek-v4-flash` |

4. Ensure the account has granted or topped-up balance, save, and redeploy.

Do not use the older `deepseek-chat` or `deepseek-reasoner` names; DeepSeek's
documentation states that they were deprecated in July 2026.

## Switching or limiting providers

Change `AI_PROVIDERS` or the provider-specific keys and models. No code change
is required after this version is live, although Vercel must redeploy after an
environment-variable change.

| Provider | Provider key variable | Suggested model variable | Free status |
| --- | --- | --- | --- |
| Groq/Llama | `GROQ_API_KEY` | `GROQ_MODEL=llama-3.1-8b-instant` | Free plan with limits |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL=gemini-2.5-flash` | Free tier in supported regions |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL=openrouter/free` | Free models with low limits |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL=deepseek-v4-flash` | Paid usage or granted balance |

## Security and production checklist

- Never add `NEXT_PUBLIC_` to any provider API key. Variables with that prefix
  can be exposed to browser code.
- Never paste a real key into `.env.example`, GitHub, screenshots, or support
  messages.
- Create separate keys for local development and Vercel production.
- Rotate a key immediately if it is exposed.
- Keep the verified college-fit calculation as the source of ranking. The AI
  writes a staff-facing explanation; it does not calculate or overwrite scores.
- Staff must verify admissions, fees, eligibility, placements, and scholarship
  facts before advising a student.
- Free tiers are rate-limited and can change. For production, add monitoring and
  plan for a paid tier or a secondary provider.

## Local test

1. Copy `.env.example` to `.env.local`.
2. Add one or more providers' real keys to `.env.local`.
3. Run `npm run dev`.
4. Create or open a test student and regenerate AI Insights.
5. Confirm `.env.local` is ignored by Git before committing.

The report includes a provider-status line showing which configured models were
used or unavailable. If all providers fail, Future Plus displays the errors and
continues to show the deterministic verified college-fit table.
