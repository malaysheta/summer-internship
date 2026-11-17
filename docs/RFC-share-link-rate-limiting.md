# RFC — Share-link service + API rate limiting

**Owner:** Dharmik Sakhiya (Backend) · **Issue:** #34 · **Status:** rate limiting shipped (#343); share links proposed

## 1. API rate limiting (shipped)

`apps/web/lib/rate-limiter.ts` — Postgres counter over `agent_traces`, applied
to every route that runs the Drafter (`POST /api/draft`, `/retry`, `/iterate`).

| Decision | Why |
|---|---|
| Per-user key (`auth.uid()`), not per-IP | Every agent call is authenticated; IP limits punish shared college NATs |
| Count `agent_traces` rows (agent_name = drafter, last hour) instead of Upstash/Redis | The tracer already writes one row per LLM call, so the counter is free, survives cold starts and needs no new infra. Serverless-safe |
| Fail-open on DB error | A tracing outage must not lock every user out of drafting |
| 429 JSON error | Intake page shows "try again in an hour" |

Limit: 10 Drafter runs / hour / user — one constant in `rate-limiter.ts`.
Upgrade path: per-API-key limits need an `api_keys` table; not in v1 (no external callers).

## 2. Share-link service (proposed, not built)

### Schema

```sql
create table public.share_links (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  token         text not null unique,                  -- 32 bytes base64url
  visibility    text not null default 'link_only'
                check (visibility in ('private','link_only','public')),
  passcode_hash text,                                  -- bcrypt via pgcrypto, nullable
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_by    uuid not null references public.users(id),
  created_at    timestamptz not null default now()
);
-- RLS: owner all; anyone can SELECT a row by token when visibility <> 'private'
-- and (expires_at is null or expires_at > now()) and revoked_at is null.
```

### Endpoints

| Route | Body / params | Returns |
|---|---|---|
| `POST /api/documents/{id}/share` | `{ visibility, expires_in_hours?, passcode? }` | `{ url, token, expires_at }` |
| `GET /api/share/{token}` | `?passcode=` when set | read-only `DocumentWithVersion` + `"AI-generated draft — not legal advice"` banner |
| `DELETE /api/documents/{id}/share/{token}` | — | 204 (sets `revoked_at`) |

Shared views are rendered at `/[locale]/s/{token}` with the editor in read-only mode.
Every `GET /api/share/{token}` writes an `agent_traces`-style audit row
(`share_link_views`) so Aayush's audit export can show who opened what.

### Not doing

- Public search indexing (`public` visibility only means "no passcode"; pages are `noindex`).
- Per-API-key limits: there are no API keys in v1; revisit with the first external integration.
