---
name: webhooks
description: >
  Use this skill before touching any webhook handler (Twilio, Meta, Stripe) or
  before adding a new external integration. Also use when debugging webhook failures.
---

# ClientPilot — Webhook Checklist

## When to use
- Before editing `app/api/twilio/webhook/`, `app/api/meta/webhook/`, `app/api/stripe/webhook/`
- Before adding a new provider webhook
- When a webhook is returning unexpected errors or retrying

## Pre-edit checklist
- [ ] Signature validation is present and runs **before** any business logic
- [ ] Raw body (`req.text()`) is captured before any JSON parse (required by Stripe)
- [ ] Route has `export const runtime = "nodejs"` (not edge)
- [ ] Returns HTTP 200 for unhandled event types — not 400/404 (prevents retry storms)
- [ ] BullMQ jobs enqueued from webhooks use `jobId` for deduplication

## Signature validation quick reference

### Twilio
```ts
const valid = twilio.validateRequest(
  env.twilio.token,
  req.headers.get("x-twilio-signature") ?? "",
  `${env.appUrl}/api/twilio/webhook`,
  params                          // URLSearchParams as plain object
);
if (!valid) return new NextResponse("Invalid signature", { status: 403 });
```
Skip only in `process.env.NODE_ENV !== "production"`.

### Meta (Cloud API)
```ts
import { createHmac, timingSafeEqual } from "crypto";
// GET — verification handshake
const mode = url.searchParams.get("hub.mode");
const token = url.searchParams.get("hub.verify_token");
if (mode === "subscribe" && token === env.meta.verifyToken)
  return new NextResponse(url.searchParams.get("hub.challenge"));

// POST — validate X-Hub-Signature-256 on raw body (META_APP_SECRET). See app/api/meta/webhook/route.ts
const rawBody = await req.text();
const sig = req.headers.get("x-hub-signature-256") ?? "";
const expected = "sha256=" + createHmac("sha256", env.meta.appSecret).update(rawBody, "utf8").digest("hex");
const a = Buffer.from(sig, "utf8");
const b = Buffer.from(expected, "utf8");
if (a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse("Invalid signature", { status: 403 });
const body = JSON.parse(rawBody);
```

### Stripe
```ts
const raw = await req.text();
const event = stripe.webhooks.constructEvent(raw, sig, env.stripe.webhookSecret);
// constructEvent throws on bad sig — catch and return 400
```

## Adding a new integration
1. Add env vars to `.env.example` (with comment).
2. Add to `lib/env.ts`.
3. Create `lib/<provider>.ts` SDK wrapper.
4. New route: `app/api/<provider>/webhook/route.ts`.
5. Signature check first. Business logic second.
6. Update `AGENTS.md` API routes table.
7. Update `integrations.mdc` with provider-specific notes.

## Debugging
- **Twilio**: Use Twilio Console > Monitor > Logs to see raw webhook payloads and response codes.
- **Meta**: Graph API Explorer for manual test sends; check `hub.verify_token` matches `META_VERIFY_TOKEN`.
- **Stripe**: `stripe listen --forward-to localhost:3000/api/stripe/webhook` for local testing.
- **All**: Check `vercel.json` timeout — Stripe/Twilio have short retry windows; keep handlers fast.
