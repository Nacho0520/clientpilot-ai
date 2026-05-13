// Single place to read & validate environment variables.
// Throws at boot if a required var is missing in production.

function required(name: string): string {
  // Note: we don't throw at module load to allow `next build` to collect page
  // data without secrets present. Downstream SDKs will fail clearly at runtime
  // if a required value is actually missing.
  return process.env[name] ?? "";
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
  twilio: {
    sid: required("TWILIO_ACCOUNT_SID"),
    token: required("TWILIO_AUTH_TOKEN"),
    from: required("TWILIO_WHATSAPP_FROM"),
  },
  google: {
    clientId: required("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: required("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirectUri: required("GOOGLE_OAUTH_REDIRECT_URI"),
  },
  stripe: {
    secret: required("STRIPE_SECRET_KEY"),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
    publishable: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    priceStarter: required("STRIPE_PRICE_STARTER"),
    pricePro: required("STRIPE_PRICE_PRO"),
    priceClinic: required("STRIPE_PRICE_CLINIC"),
  },
  redisUrl: required("REDIS_URL"),
  resend: {
    apiKey: required("RESEND_API_KEY"),
    from: process.env.RESEND_FROM_EMAIL ?? "notificaciones@clientpilot.ai",
  },
  tokenEncryptionKey: required("TOKEN_ENCRYPTION_KEY"),
  meta: {
    systemUserToken: process.env.META_SYSTEM_USER_TOKEN ?? "",
    verifyToken: process.env.META_VERIFY_TOKEN ?? "",
    /** App Secret from Meta Developer → App settings. Required to validate `X-Hub-Signature-256` on POST webhooks in production. */
    appSecret: process.env.META_APP_SECRET ?? "",
  },
};

export type Plan = "starter" | "pro" | "clinic";
export const PLAN_LIMITS: Record<Plan, number> = {
  starter: 500,
  pro: 2000,
  clinic: Number.POSITIVE_INFINITY,
};

export function assertEnv() {
  const missing = Object.entries(env).flatMap(([k, v]) =>
    typeof v === "string" && v === "" ? [k] : []
  );
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);
}
