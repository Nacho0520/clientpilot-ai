import Stripe from "stripe";
import { env } from "./env";

/** True when Stripe keys are configured and billing is enabled. */
export const isBillingEnabled = !env.billingDisabled && Boolean(env.stripe.secret);

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!isBillingEnabled) throw new Error("Stripe is not configured. Set BILLING_DISABLED=false and provide STRIPE_SECRET_KEY.");
  if (!_stripe) _stripe = new Stripe(env.stripe.secret, { apiVersion: "2025-02-24.acacia" });
  return _stripe;
}
// Backwards-compat proxy: any property access constructs the client lazily.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return Reflect.get(getStripe() as object, prop);
  },
});

export const PRICE_IDS = {
  starter: env.stripe.priceStarter,
  pro: env.stripe.pricePro,
  clinic: env.stripe.priceClinic,
} as const;

export function planFromPriceId(priceId: string | null | undefined): "starter" | "pro" | "clinic" | null {
  if (!priceId) return null;
  if (priceId === PRICE_IDS.starter) return "starter";
  if (priceId === PRICE_IDS.pro) return "pro";
  if (priceId === PRICE_IDS.clinic) return "clinic";
  return null;
}
