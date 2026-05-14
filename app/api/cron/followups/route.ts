import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { scanForFollowUps, sendDueFollowUps } from "@/lib/followups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  // Hash both values to ensure equal-length buffers required by timingSafeEqual,
  // which also prevents leaking the secret length via timing.
  const providedHash = createHash("sha256").update(auth).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  if (!timingSafeEqual(providedHash, expectedHash)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const queued = await scanForFollowUps();
  const sent = await sendDueFollowUps();
  return NextResponse.json({ ok: true, queued, sent });
}
