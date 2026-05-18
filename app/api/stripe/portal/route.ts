import { NextResponse } from "next/server";
import { authApi } from "@/lib/auth";
import { stripe, isBillingEnabled } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST() {
  if (!isBillingEnabled) {
    return NextResponse.json(
      { error: "Facturación no configurada. Disponible próximamente." },
      { status: 503 }
    );
  }

  const session = await authApi();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { user, supa } = session;

  const { data: biz } = await supa.from("businesses").select("stripe_customer_id").eq("owner_id", user.id).single();
  if (!biz?.stripe_customer_id) return NextResponse.json({ error: "no customer" }, { status: 400 });
  const portal = await stripe.billingPortal.sessions.create({
    customer: biz.stripe_customer_id,
    return_url: `${env.appUrl}/dashboard/billing`,
  });
  return NextResponse.json({ url: portal.url });
}
