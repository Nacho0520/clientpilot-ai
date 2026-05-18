import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

export const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const followUpsQueue = new Queue("followups", { connection });
export const remindersQueue = new Queue("reminders", { connection });
export const reviewsQueue = new Queue("reviews", { connection });

