// Single place to read & validate environment variables.
// Throws at boot if a required var is missing in production.

/** Returns the env var value or empty string. Use assertEnv() or assertWorkerEnv() for validation at startup. */
function getEnv(name: string): string {
  // Note: we don't throw at module load to allow `next build` to collect page
  // data without secrets present. Downstream SDKs will fail clearly at runtime
  // if a required value is actually missing.
  return process.env[name] ?? "";
}

const billingDisabled =
  process.env.BILLING_DISABLED === "true" || process.env.BILLING_DISABLED === "1";

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicApiKey: getEnv("ANTHROPIC_API_KEY"),
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
  twilio: {
    sid: getEnv("TWILIO_ACCOUNT_SID"),
    token: getEnv("TWILIO_AUTH_TOKEN"),
    from: getEnv("TWILIO_WHATSAPP_FROM"),
  },
  google: {
    clientId: getEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: getEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirectUri: getEnv("GOOGLE_OAUTH_REDIRECT_URI"),
  },
  // Stripe vars are always optional in env object; their presence is checked
  // via isBillingEnabled before use. When BILLING_DISABLED=true, they're never accessed.
  stripe: {
    secret: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    publishable: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    priceStarter: process.env.STRIPE_PRICE_STARTER ?? "",
    pricePro: process.env.STRIPE_PRICE_PRO ?? "",
    priceClinic: process.env.STRIPE_PRICE_CLINIC ?? "",
  },
  billingDisabled,
  redisUrl: getEnv("REDIS_URL"),
  resend: {
    apiKey: getEnv("RESEND_API_KEY"),
    from: process.env.RESEND_FROM_EMAIL ?? "notificaciones@clientpilot.ai",
  },
  tokenEncryptionKey: getEnv("TOKEN_ENCRYPTION_KEY"),
  meta: {
    systemUserToken: process.env.META_SYSTEM_USER_TOKEN ?? "",
    verifyToken: process.env.META_VERIFY_TOKEN ?? "",
    /** App Secret from Meta Developer → App settings. Required to validate `X-Hub-Signature-256` on POST webhooks in production. */
    appSecret: process.env.META_APP_SECRET ?? "",
  },
  sentry: {
    dsn: process.env.SENTRY_DSN ?? "",
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  },
  posthog: {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
  },
};

export type Plan = "starter" | "pro" | "clinic";
export const PLAN_LIMITS: Record<Plan, number> = {
  starter: 500,
  pro: 2000,
  clinic: Number.POSITIVE_INFINITY,
};

/**
 * Full env check for the Next.js app (webhooks, API routes).
 * Skips Stripe when BILLING_DISABLED=true.
 */
export function assertEnv() {
  const required: (keyof typeof env)[] = [
    "supabaseUrl",
    "supabaseAnonKey",
    "supabaseServiceRoleKey",
    "anthropicApiKey",
    "redisUrl",
    "tokenEncryptionKey",
  ];
  const missing = required.filter((k) => env[k] === "");

  if (!env.billingDisabled) {
    const missingStripe = (["secret", "webhookSecret", "priceStarter", "pricePro", "priceClinic"] as const)
      .filter((k) => env.stripe[k] === "")
      .map((k) => `stripe.${k}`);
    missing.push(...(missingStripe as (keyof typeof env)[]));
  }

  if (missing.length) {
    throw new Error(
      `Missing env vars: ${missing.join(", ")}\n` +
      `  → Set them in Vercel (app) or Railway (worker) environment settings.\n` +
      `  → See .env.example for the full list.`
    );
  }
}

/**
 * Minimal env check for the BullMQ worker process.
 * The worker does NOT need Anthropic, Stripe, Google OAuth, or Twilio/Meta
 * at start-up — those SDKs fail at call-time with a clear error if missing.
 */
export function assertWorkerEnv() {
  const required = ["supabaseUrl", "supabaseAnonKey", "supabaseServiceRoleKey", "redisUrl", "tokenEncryptionKey"] as const;
  const missing = required.filter((k) => env[k] === "");
  if (missing.length) {
    throw new Error(
      `[worker] Missing required env vars: ${missing.join(", ")}\n` +
      `  → Add them to the Railway service's Variables tab.\n` +
      `  → Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL, TOKEN_ENCRYPTION_KEY`
    );
  }
}
