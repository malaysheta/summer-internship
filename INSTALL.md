# Installation

## 1. Prerequisites

- Node.js 20+
- pnpm 9 — `npm install -g pnpm@9`
- Docker (or `brew install colima docker && colima start`)
- Supabase CLI — `brew install supabase/tap/supabase`

## 2. Clone and install

```bash
git clone https://github.com/malaysheta/summer-internship.git
cd summer-internship
pnpm install                       # creates node_modules (not committed)
pnpm -r --filter '!web' build      # build internal packages
```

## 3. Start the local database

```bash
pnpm db:start              # local Supabase (Postgres :54322, API :54321, Studio :54323)
pnpm db:reset              # apply migrations + seed data
pnpm db:seed:pageindex     # load indexed Acts
pnpm db:status             # prints local anon + service_role keys
```

## 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from db:status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from db:status>

# LLM (Claude on Amazon Bedrock)
AWS_BEARER_TOKEN_BEDROCK=<your token>
BEDROCK_REGION=<e.g. us-east-1>
BEDROCK_MODEL_ID=<bedrock model id>
```

Copy the same file to `apps/web/.env.local`.

## 5. Run

```bash
pnpm dev
```

Open http://localhost:3000.
