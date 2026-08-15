# Future Plus AI provider setup

Future Plus supports Groq, Gemini, OpenRouter and DeepSeek. Provider keys remain server-side. The verified college-fit engine remains authoritative for ranking; AI generates staff-facing explanations and does not overwrite deterministic fit scores.

## Recommended Groq configuration

Use these variables for new Preview and Production deployments:

| Variable | Recommended value | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | your Groq key | Server-side authentication |
| `GROQ_PRIMARY_MODEL` | `openai/gpt-oss-120b` | Counselling analysis and final synthesis |
| `GROQ_FAST_MODEL` | `openai/gpt-oss-20b` | Lightweight evidence-to-JSON formatting |
| `GROQ_SEARCH_MODEL` | `groq/compound` | Live university/college discovery |

`GROQ_MODEL` remains supported temporarily for backward compatibility, but new deployments should use `GROQ_PRIMARY_MODEL` and `GROQ_FAST_MODEL`.

Do not use legacy defaults such as `llama-3.1-8b-instant` or `llama-3.3-70b-versatile` for new Free/Developer-tier deployments. Groq scheduled those models to shut down for those tiers on 16 August 2026.

## Preview-first migration

For the migration branch, scope all new variables to **Preview only** first.

Recommended Preview configuration:

```text
AI_PROVIDERS=groq
GROQ_API_KEY=<preview Groq key>
GROQ_PRIMARY_MODEL=openai/gpt-oss-120b
GROQ_FAST_MODEL=openai/gpt-oss-20b
GROQ_SEARCH_MODEL=groq/compound
WEB_DISCOVERY_PROVIDERS=groq
AI_MAX_OUTPUT_TOKENS=3200
```

Keep the existing Supabase, authentication and staff-access variables available to Preview as well. Do not change Production variables until the Preview tests pass.

Using only `groq` in `AI_PROVIDERS` during the migration test isolates the new Groq path. After validation, additional providers can be re-enabled if the multi-model strategy is intentionally retained.

## Multi-provider configuration

Future Plus can still consult multiple configured providers in parallel:

```text
AI_PROVIDERS=groq,gemini,openrouter,deepseek
```

Only providers with both an enabled name and an API key are called. The first successful provider in the configured order is used for synthesis when several providers succeed.

Supported examples:

```text
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_SEARCH_MODEL=gemini-2.5-flash

OPENROUTER_API_KEY=<key>
OPENROUTER_MODEL=openrouter/free
OPENROUTER_WEB_SEARCH=false

DEEPSEEK_API_KEY=<key>
DEEPSEEK_MODEL=deepseek-v4-flash
```

## Backward compatibility

The application still recognizes the legacy single-provider pattern:

```text
AI_PROVIDER=groq
AI_API_KEY=<key>
AI_MODEL=openai/gpt-oss-120b
```

It also temporarily recognizes:

```text
GROQ_MODEL=openai/gpt-oss-120b
```

These compatibility paths are intended to prevent migration outages. Prefer the new provider-specific variables for all newly configured environments.

## Preview validation checklist

After the Preview deployment is READY:

1. Sign in using a permitted Future Plus staff account.
2. Open an existing test student or create a non-sensitive test profile.
3. Run or regenerate **AI Insights**.
4. Confirm the provider-status line reports `groq (openai/gpt-oss-120b): used`.
5. Confirm all seven report sections are present and that no college, fee, placement figure, scholarship or admission rule is invented.
6. Confirm deterministic college-fit scores and rankings are unchanged by the AI output.
7. Run **web college discovery** for at least two different student profiles.
8. Confirm the discovery provider reports Groq usage and returns current HTTPS source URLs.
9. Confirm lightweight formatting uses `openai/gpt-oss-20b` when Compound search evidence needs conversion.
10. Check Vercel runtime logs for provider errors, timeouts or malformed JSON.
11. Test one failure case by temporarily removing the Preview Groq key or using a controlled invalid Preview value, then restore it. The deterministic verified-fit table must remain available when AI is unavailable.
12. Do not copy real student data into support messages or screenshots.

## Production promotion gate

Do not change Production until all Preview tests pass.

For Production, use:

```text
GROQ_PRIMARY_MODEL=openai/gpt-oss-120b
GROQ_FAST_MODEL=openai/gpt-oss-20b
GROQ_SEARCH_MODEL=groq/compound
```

During the first Production release, `GROQ_MODEL=openai/gpt-oss-120b` may be retained temporarily if the existing environment already uses that key name. Remove the legacy variable only after the new deployment has been verified.

## Security requirements

- Never prefix an AI provider secret with `NEXT_PUBLIC_`.
- Never commit real API keys to GitHub or `.env.example`.
- Keep Preview and Production secrets separately scoped where practical.
- Rotate any credential that is exposed in a screenshot, commit or support channel.
- Staff must independently verify eligibility, fees, placements, scholarships and admissions deadlines using current institutional sources before advising a student.
- Treat live-web results as discovery candidates requiring staff verification, not as authoritative admissions data.
