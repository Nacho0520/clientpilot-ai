import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default withSentryConfig(config, {
  // Sentry project org/project slugs — set these in SENTRY_ORG / SENTRY_PROJECT env vars
  // or hard-code if preferred (not secrets).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps only when SENTRY_AUTH_TOKEN is available (CI / Vercel build).
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production builds to avoid noise in dev.
  silent: !process.env.CI,

  // Disable source map upload if no auth token (local builds, CI without token).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Automatically tree-shake Sentry logger statements in production.
  disableLogger: true,

  // Automatically instrument Next.js API routes.
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
});
