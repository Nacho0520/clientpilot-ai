/**
 * Long-running worker process. Run with: `pnpm run worker`.
 * - Hourly scan for new follow-up candidates + delivery of due follow-ups.
 * - Scheduled reminder + review request jobs.
 */
import * as Sentry from "@sentry/node";
import { Worker, QueueEvents } from "bullmq";
import { connection, followUpsQueue } from "../lib/queue";
import { scanForFollowUps, sendDueFollowUps, sendReminder, sendReviewRequest } from "../lib/followups";
import { assertWorkerEnv, env } from "../lib/env";

// Init Sentry before anything else so errors during boot are captured too.
if (env.sentry.dsn) {
  Sentry.init({
    dsn: env.sentry.dsn,
    environment: env.sentry.environment,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      // Strip any accidentally logged secrets.
      if (event.extra) {
        delete event.extra["SUPABASE_SERVICE_ROLE_KEY"];
        delete event.extra["STRIPE_SECRET_KEY"];
      }
      return event;
    },
  });
}

// ANTHROPIC_API_KEY is not checked here because the worker boots before it's needed.
// It will throw at call-time in lib/ai/ if missing.
assertWorkerEnv();

new Worker(
  "followups",
  async (job) => {
    if (job.name === "scan") {
      const q = await scanForFollowUps();
      const s = await sendDueFollowUps();
      return { queued: q, sent: s };
    }
    return null;
  },
  { connection }
);

new Worker(
  "reminders",
  async (job) => {
    await sendReminder(job.data.appointmentId);
  },
  { connection }
);

new Worker(
  "reviews",
  async (job) => {
    await sendReviewRequest(job.data.appointmentId);
  },
  { connection }
);

async function start() {
  // Hourly repeating scan (tsx/CJS no soporta top-level await).
  await followUpsQueue.add(
    "scan",
    { trigger: "hourly_scan" },
    { repeat: { pattern: "0 * * * *" } }
  );
  // Keep process alive.
  new QueueEvents("followups", { connection });
  console.log("[worker] ClientPilot worker started");
}

start().catch((err) => {
  Sentry.captureException(err);
  console.error("[worker] failed to start:", err);
  process.exit(1);
});
