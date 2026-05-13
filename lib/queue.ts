import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

export const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const followUpsQueue = new Queue("followups", { connection });
export const remindersQueue = new Queue("reminders", { connection });
export const reviewsQueue = new Queue("reviews", { connection });

export type ReminderJob = { appointmentId: string };
export type FollowUpScanJob = { trigger: "hourly_scan" };
export type ReviewJob = { appointmentId: string };
