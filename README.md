# ClientPilot AI

Tu recepcionista IA para WhatsApp — diseñada para clínicas estéticas y dentales.

## Stack
- Next.js 15 (App Router) — frontend + API routes
- Supabase (Postgres + Auth + pgvector)
- Anthropic Claude Sonnet 4.5 — AI agent
- Twilio WhatsApp Business API
- Google Calendar API
- Stripe — subscription billing
- BullMQ + Redis — scheduled jobs (worker process)
- Resend — transactional email
- Vercel (frontend) + Railway (worker + Redis)

## Quickstart
1. `cp .env.example .env.local` and fill in keys.
2. Instala dependencias: `corepack enable` (Node 16.13+) y luego `pnpm install` (versión fijada en `package.json`).
3. Start local Supabase: `pnpm exec supabase start`
4. Apply migrations: `pnpm exec supabase db reset`
5. `pnpm run dev` (web), `pnpm run worker` (background jobs).

## GitHub y despliegue
- Subir el código: `gh auth login` y luego `bash scripts/github-bootstrap.sh` (ver [DEPLOY.md](DEPLOY.md)).
- Vercel: conecta el repo en el dashboard para despliegues automáticos por push.

## Module Status
- [x] Module 1 — Core Infrastructure (Supabase schema, env validation, Stripe webhook plumbing, BullMQ queues)
- [x] Module 2 — WhatsApp Webhook + AI Response Engine (Twilio + Meta inbound handlers, Claude intent → reply pipeline)
- [x] Module 3 — Appointment Scheduling (Google Calendar OAuth, slot proposals, appointment creation via `lib/calendar/booking.ts`)
- [x] Module 4 — Follow-up Automation (BullMQ worker scans + sends due follow-ups, reminders, review requests)
- [x] Module 5 — Business Dashboard (conversations, contacts, appointments, analytics, settings pages)
- [x] Module 6 — Onboarding Flow (multi-step wizard at `app/onboarding/`, business profile creation)
- [x] Module 7 — Stripe Billing (plans: starter / pro / clinic, checkout, portal, invoice webhook resets AI counter)
- [x] Module 8 — Landing Page (marketing page at `app/page.tsx` with pricing, features, CTA)
