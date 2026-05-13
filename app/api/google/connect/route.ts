import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAuthUrl } from "@/lib/calendar/google";

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return NextResponse.redirect(new URL("/onboarding", process.env.NEXT_PUBLIC_APP_URL));
  return NextResponse.redirect(generateAuthUrl(biz.id));
}
