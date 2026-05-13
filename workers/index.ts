/**
 * Long-running worker process. Run with: `npm run worker`.
 * - Hourly scan for new follow-up candidates + delivery of due follow-ups.
 * - Scheduled reminder + review request jobs.
 */
import { Worker, QueueEvents } from "bullmq";
import { connection, followUpsQueue } from "../lib/queue";
import { scanForFollowUps, sendDueFollowUps, sendReminder, sendReviewRequest } from "../lib/followups";
import { assertEnv } from "../lib/env";

assertEnv();

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

// Hourly repeating scan.
await followUpsQueue.add(
  "scan",
  { trigger: "hourly_scan" },
  { repeat: { pattern: "0 * * * *" } }
);

// Keep process alive.
new QueueEvents("followups", { connection });

console.log("[worker] ClientPilot worker started");
