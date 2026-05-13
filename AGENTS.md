# AGENTS.md — ClientPilot AI Navigation

## What this file is
Quick index for AI agents and new contributors. For full conventions see `.cursor/rules/`.

## Entrypoints
| What | Where |
|---|---|
| App root | `app/page.tsx` (landing) |
| Dashboard | `app/dashboard/` |
| Onboarding | `app/onboarding/` |
| Admin panel | `app/admin/` |
| Auth | `app/(auth)/login/` |

## Core library modules
| Module | Path | Notes |
|---|---|---|
| AI pipeline | `lib/ai/pipeline.ts` | Full inbound message flow |
| Intent classifier | `lib/ai/intent.ts` | Claude call, returns `Intent` type |
| Reply generator | `lib/ai/respond.ts` | Claude call, returns string |
| System prompt builder | `lib/ai/prompt.ts` | Assembles business context |
| Domain types | `lib/types.ts` | `Plan`, `Intent`, `ConversationStatus`, etc |
| Env validation | `lib/env.ts` | `env.*`, `PLAN_LIMITS`, `assertEnv()` |
| Queue definitions | `lib/queue.ts` | `followUpsQueue`, `remindersQueue`, `reviewsQueue` |
| Follow-up logic | `lib/followups.ts` | Scan + send due follow-ups |
| Calendar booking | `lib/calendar/booking.ts` | Slot proposal + appointment creation |

## Supabase
| Client | Path | When to use |
|---|---|---|
| Server (RLS) | `lib/supabase/server.ts` | Server Components, Actions |
| Admin (service-role) | `lib/supabase/admin.ts` | Webhooks, worker — add `business_id` filter manually |
| Browser | `lib/supabase/client.ts` | Client Components |
| Middleware | `lib/supabase/middleware.ts` | Session refresh only |
| Migrations | `supabase/migrations/` | Sequential: `000N_description.sql` |
| Type gen | `npm run db:types` | Outputs `lib/supabase/database.types.ts` |

## API routes (webhooks)
| Route | File |
|---|---|
| Twilio WhatsApp inbound | `app/api/twilio/webhook/route.ts` |
| Meta Cloud API inbound | `app/api/meta/webhook/route.ts` |
| Stripe events | `app/api/stripe/webhook/route.ts` |
| Google OAuth return | `app/api/google/callback/route.ts` |
| Follow-up cron | `app/api/cron/followups/route.ts` |

## Background worker
Start: `npm run worker` (runs `workers/index.ts` via tsx)
Queues: `followups` (hourly scan), `reminders` (pre-appointment), `reviews` (post-appointment)
Requires Redis at `REDIS_URL`.

## Dev commands
```bash
npm run dev          # Next.js dev server
npm run worker       # BullMQ worker (separate terminal)
npm run db:types     # Regenerate Supabase types
supabase start       # Local Supabase stack
supabase db push     # Apply pending migrations to local
```
