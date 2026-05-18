import { NextResponse, type NextRequest } from "next/server";
import { authApi } from "@/lib/auth";
import { stripe, PRICE_IDS, isBillingEnabled } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  if (!isBillingEnabled) {
    return NextResponse.json(
      { error: "Facturación no configurada. Disponible próximamente." },
      { status: 503 }
    );
  }

  const { plan } = (await req.json()) as { plan: "starter" | "pro" | "clinic" };
  const priceId = PRICE_IDS[plan];
  if (!priceId) return NextResponse.json({ error: "invalid plan" }, { status: 400 });

  const session = await authApi();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { user, supa } = session;

  const { data: biz } = await supa.from("businesses").select("id, stripe_customer_id").eq("owner_id", user.id).single();
  if (!biz) return NextResponse.json({ error: "no business" }, { status: 400 });

  let customerId = biz.stripe_customer_id;
  if (!customerId) {
    const c = await stripe.customers.create({ email: user.email!, metadata: { business_id: biz.id } });
    customerId = c.id;
    await supa.from("businesses").update({ stripe_customer_id: customerId }).eq("id", biz.id);
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.appUrl}/dashboard/billing?ok=1`,
    cancel_url: `${env.appUrl}/dashboard/billing?cancelled=1`,
    metadata: { business_id: biz.id, plan },
    subscription_data: { trial_period_days: 14 },
  });
  return NextResponse.json({ url: checkoutSession.url });
}
