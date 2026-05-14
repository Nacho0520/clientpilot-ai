---
name: local-dev
description: >
  Use this skill when setting up or resetting the ClientPilot local dev environment,
  or when the dev server, worker, or Supabase stack is not running correctly.
---

# ClientPilot — Local Dev Setup

## When to use
Starting from scratch, onboarding, after a `git pull` with new migrations, or diagnosing a broken local stack.

## Prerequisites
- Node 20+, pnpm (vía `corepack enable`; versión en `package.json` → `packageManager`), Docker (for Supabase local)
- `supabase` CLI (incluida como devDependency; usa `pnpm exec supabase …`)
- Redis running locally or via Docker

## Steps

### 1. Install dependencies
```bash
corepack enable
pnpm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in values — minimum required for local:
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# ANTHROPIC_API_KEY, REDIS_URL=redis://localhost:6379
# TOKEN_ENCRYPTION_KEY (any 32-byte hex string for local)
```

### 3. Start Supabase
```bash
pnpm exec supabase start
# Outputs local URL + anon key + service_role key → copy to .env
```

### 4. Apply migrations
```bash
pnpm exec supabase db push
# or: node scripts/migrate.mjs (direct pg approach)
```

### 5. Regenerate types (after any schema change)
```bash
pnpm run db:types
# Writes lib/supabase/database.types.ts
```

### 6. Seed data (optional)
```bash
node scripts/seed.mjs
```

### 7. Start services (two terminals)
```bash
# Terminal 1
pnpm run dev

# Terminal 2 (BullMQ worker — needed for follow-ups/reminders/reviews)
pnpm run worker
```

### 8. Verify
- App: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Worker logs: `[worker] ClientPilot worker started`

## Common issues
| Symptom | Fix |
|---|---|
| `Missing env vars: ...` at worker start | Run `assertEnv()` passes — fill missing `.env` values |
| `connect ECONNREFUSED` on Redis | Start Redis: `docker run -p 6379:6379 redis` |
| Types out of date after migration | `pnpm run db:types` |
| Supabase already running | `pnpm exec supabase stop && pnpm exec supabase start` |
| Google OAuth 400 on callback | `GOOGLE_OAUTH_REDIRECT_URI` must exactly match Google Console |
