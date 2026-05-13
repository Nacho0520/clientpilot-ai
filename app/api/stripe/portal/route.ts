import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { data: biz } = await supa.from("businesses").select("stripe_customer_id").eq("owner_id", user.id).single();
  if (!biz?.stripe_customer_id) return NextResponse.json({ error: "no customer" }, { status: 400 });
  const portal = await stripe.billingPortal.sessions.create({
    customer: biz.stripe_customer_id,
    return_url: `${env.appUrl}/dashboard/billing`,
  });
  return NextResponse.json({ url: portal.url });
}
