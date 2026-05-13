import { NextResponse, type NextRequest } from "next/server";
import { oauth2Client, encryptTokens } from "@/lib/calendar/google";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return new NextResponse("Missing code/state", { status: 400 });

  const oauth = oauth2Client();
  const { tokens } = await oauth.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    return new NextResponse("Missing tokens — try again", { status: 400 });
  }

  const supa = createAdminClient();
  await supa
    .from("businesses")
    .update({
      google_oauth_tokens_encrypted: encryptTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date ?? undefined,
      }),
    })
    .eq("id", state);

  return NextResponse.redirect(new URL("/dashboard/settings?google=connected", process.env.NEXT_PUBLIC_APP_URL));
}
