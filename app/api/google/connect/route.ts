export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { authApi } from "@/lib/auth";
import { generateAuthUrl } from "@/lib/calendar/google";

export async function GET() {
  const session = await authApi();
  if (!session) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  const { user, supa } = session;

  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return NextResponse.redirect(new URL("/onboarding", process.env.NEXT_PUBLIC_APP_URL));
  return NextResponse.redirect(generateAuthUrl(biz.id));
}
