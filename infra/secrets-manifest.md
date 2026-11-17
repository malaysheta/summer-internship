# Secrets manifest

Every environment variable the project reads, where it lives, and who owns it.
**Names only — never values.** (#32, #209)

| Variable | Scope | Where it lives | Owner | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | `.env.local`, Vercel (all envs), GitHub Actions | Backend (Om) | Local stack: `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | same | Backend (Om) | RLS-scoped; ships in the browser bundle |
| `SUPABASE_URL` | server | `.env.local`, Vercel | Agents (Malay) | Alias read by the tracer + PageIndex tool |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Vercel, GitHub Secrets | Backend (Om) | Bypasses RLS. Local stack prints a dev value from `supabase start` |
| `SUPABASE_SERVICE_KEY` | server | same | PageIndex (Tirth) | Legacy alias used by `packages/pageindex` ingestion |
| `SUPABASE_DB_PASSWORD` | server | Vercel, GitHub Secrets | Backend (Om) | Only for `supabase db push` against hosted projects |
| `DEEPSEEK_API_KEY` | server | `.env.local`, Vercel, GitHub Secrets | Agents (Yug) | Primary LLM provider |
| `ANTHROPIC_API_KEY` | server | same | Agents (Yug) | Translator preferred provider; fallback for every other step |
| `OPENAI_API_KEY` | server | same | PageIndex (Samarth) | Embeddings for hybrid search; evals A/B |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | server | same | Agents (Yug) | Gemini provider (evals A/B) |
| `SENTRY_DSN` | server | Vercel, GitHub Secrets | DevOps (Prins) | Read by `apps/web/instrumentation.ts`; unset = Sentry off |
| `NEXT_PUBLIC_SENTRY_DSN` | public | Vercel | DevOps (Prins) | Read by `apps/web/instrumentation-client.ts` |
| `NEXT_PUBLIC_APP_URL` | public | `.env.local`, Vercel | DevOps | Eval harness posts results here |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | public | `.env.local`, Vercel | Frontend (Vraj) | `en` |
| `NEXT_PUBLIC_DEMO_MODE` | public | `.env.local` only | Frontend (Sohil) | `true` bypasses the auth redirect in middleware. Never set on Vercel |
| `CITATOR_BYPASS` | server | never on Vercel | Agents (Hitarth) | Emergency off-switch for the Citator gate |

## Rotation

Rotate a server secret by updating it in Vercel + GitHub Secrets, then
redeploying. `.env.local` is gitignored; interns get public values from
`.env.example` and the local Supabase stack (`pnpm db:start`).
