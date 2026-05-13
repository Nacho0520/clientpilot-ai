import { NextResponse } from "next/server";
import { scanForFollowUps, sendDueFollowUps } from "@/lib/followups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const queued = await scanForFollowUps();
  const sent = await sendDueFollowUps();
  return NextResponse.json({ ok: true, queued, sent });
}
