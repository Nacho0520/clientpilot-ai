import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runInboundPipeline } from "@/lib/ai/pipeline";
import { sendMetaMessage } from "@/lib/whatsapp/meta";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidMetaSignature(rawBody: string, signatureHeader: string, appSecret: string): boolean {
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const a = Buffer.from(signatureHeader, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.meta.verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const appSecret = env.meta.appSecret;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!appSecret) {
      console.error("META_APP_SECRET is not set; refusing Meta webhook POST.");
      return new NextResponse("Webhook misconfigured", { status: 503 });
    }
    if (!sig || !isValidMetaSignature(raw, sig, appSecret)) {
      return new NextResponse("Invalid signature", { status: 403 });
    }
  } else if (appSecret && sig && !isValidMetaSignature(raw, sig, appSecret)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const b = body as {
      entry?: Array<{
        changes?: Array<{ value?: { messages?: unknown[]; metadata?: { phone_number_id?: string } } }>;
      }>;
    };

    const entry = b?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const message = messages[0] as {
      from?: string;
      text?: { body?: string };
      profile?: { name?: string };
    };
    const from = message.from;
    const phoneNumberId = value?.metadata?.phone_number_id;
    const text = message.text?.body;

    if (!text || !from || !phoneNumberId) {
      return NextResponse.json({ ok: true });
    }

    const result = await runInboundPipeline({
      fromWhatsApp: from,
      toWhatsApp: phoneNumberId,
      body: text,
      profileName: message.profile?.name ?? null,
      metaPhoneNumberId: phoneNumberId,
    });

    if (result.ok || result.replyText) {
      const replyText = result.ok ? result.replyText : result.replyText!;
      try {
        await sendMetaMessage(from, replyText, phoneNumberId);
      } catch (e) {
        console.error("Meta send failed", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Meta webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
