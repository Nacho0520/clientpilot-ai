import { NextResponse, type NextRequest } from "next/server";
import twilio from "twilio";
import { env } from "@/lib/env";
import { runInboundPipeline } from "@/lib/ai/pipeline";
import { sendWhatsApp } from "@/lib/twilio";
import { proposeSlotsForConversation } from "@/lib/calendar/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio WhatsApp inbound webhook.
 * Twilio sends application/x-www-form-urlencoded with X-Twilio-Signature header.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = `${env.appUrl}/api/twilio/webhook`;

  if (process.env.NODE_ENV === "production") {
    const valid = twilio.validateRequest(env.twilio.token, signature, url, params as Record<string, string>);
    if (!valid) return new NextResponse("Invalid signature", { status: 403 });
  }

  const From = params.From ?? "";
  const To = params.To ?? "";
  const Body = params.Body ?? "";
  const ProfileName = params.ProfileName ?? null;

  if (!From || !To || !Body) return NextResponse.json({ ok: false }, { status: 400 });

  const result = await runInboundPipeline({
    fromWhatsApp: From,
    toWhatsApp: To,
    body: Body,
    profileName: ProfileName,
  });

  if (!result.ok && !result.replyText) return NextResponse.json({ ok: false, reason: result.reason });

  const replyToSend = result.ok ? result.replyText : result.replyText!;
  // Send AI reply.
  try {
    await sendWhatsApp(From, replyToSend, To);
  } catch (e) {
    console.error("Twilio send failed", e);
  }

  // If appointment intent, follow up with slot proposals in a second message.
  if (result.ok && result.appointmentRequested) {
    try {
      const proposal = await proposeSlotsForConversation(result.conversationId);
      if (proposal) await sendWhatsApp(From, proposal.text, To);
    } catch (e) {
      console.error("Slot proposal failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}
