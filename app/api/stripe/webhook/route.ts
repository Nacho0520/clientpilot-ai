import { NextResponse, type NextRequest } from "next/server";
import { stripe, planFromPriceId, isBillingEnabled } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isBillingEnabled) {
    return new NextResponse("Billing not configured", { status: 503 });
  }

  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripe.webhookSecret);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }
  const supa = createAdminClient();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items?.data?.[0]?.price?.id;
      const plan = planFromPriceId(priceId);
      // billing_active is true for any status except cancelled/incomplete_expired
      const billingActive = !["canceled", "incomplete_expired"].includes(sub.status);
      await supa.from("businesses").update({
        stripe_subscription_id: sub.id,
        plan: plan ?? "starter",
        billing_active: billingActive,
      }).eq("stripe_customer_id", sub.customer);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supa.from("businesses").update({
        stripe_subscription_id: null,
        plan: "starter",
        billing_active: false,
      }).eq("stripe_customer_id", sub.customer);
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      await supa.from("businesses").update({
        ai_responses_this_month: 0,
        ai_responses_month_resets_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        billing_active: true,
      }).eq("stripe_customer_id", inv.customer);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
