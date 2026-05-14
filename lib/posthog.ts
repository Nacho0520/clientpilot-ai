/**
 * PostHog server-side client (Node.js only — Next.js API routes, Server Actions).
 * For client-side tracking, use the PostHog React hook via PostHogProvider.
 */
import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      // Flush on every event in serverless environments (Next.js API routes).
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

/**
 * Capture a server-side event. No-ops silently when NEXT_PUBLIC_POSTHOG_KEY is not set.
 *
 * @example
 * captureServerEvent("onboarding_completed", userId, { business_id: biz.id, sector: biz.sector });
 */
export function captureServerEvent(
  event: string,
  distinctId: string,
  properties?: Record<string, string | number | boolean | null | undefined>
) {
  const client = getClient();
  if (!client) return;
  client.capture({ distinctId, event, properties });
}

/**
 * Identify a user on the server side.
 * Call once after sign-up or when the business profile is first created.
 */
export function identifyServer(
  distinctId: string,
  properties: Record<string, string | number | boolean | null | undefined>
) {
  const client = getClient();
  if (!client) return;
  client.identify({ distinctId, properties });
}
