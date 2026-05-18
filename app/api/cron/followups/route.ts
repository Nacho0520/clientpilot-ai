import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { scanForFollowUps, sendDueFollowUps } from "@/lib/followups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

/** Health check — safe to call via GET (no side effects). */
export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Trigger follow-up scan and delivery.
 * Use POST to prevent CSRF and unintended prefetch activation.
 * Invoke manually: curl -X POST <url> -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const [queued, sent] = await Promise.all([scanForFollowUps(), sendDueFollowUps()]);
  return NextResponse.json({ ok: true, queued, sent });
}
