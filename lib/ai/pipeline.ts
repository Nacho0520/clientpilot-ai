import { createAdminClient } from "../supabase/admin";
import { buildSystemPrompt } from "./prompt";
import { classifyIntent } from "./intent";
import { generateReply } from "./respond";
import { PLAN_LIMITS, type Plan } from "../env";
import { sendNewLeadNotification } from "../email";
import { createAppointment } from "../calendar/booking";
import type { Intent } from "../types";

export type IncomingMessage = {
  toWhatsApp: string;           // business' Twilio WhatsApp number (e.g. whatsapp:+34...)
  fromWhatsApp: string;         // customer phone (whatsapp:+34...)
  body: string;
  profileName?: string | null;
  metaPhoneNumberId?: string;   // Meta Cloud API: phone_number_id of the business number
};

export type PipelineResult =
  | { ok: true; replyText: string; conversationId: string; intent: Intent; appointmentRequested: boolean }
  | { ok: false; reason: "no_business" | "billing_inactive" | "plan_limit_reached" | "error"; replyText?: string };

const PLAN_LIMIT_FALLBACK_ES =
  "Hola, en este momento hemos alcanzado el límite de respuestas automáticas del mes. Nos pondremos en contacto contigo personalmente en breve. Disculpa las molestias.";

const BILLING_INACTIVE_FALLBACK_ES =
  "Gracias por tu mensaje. En este momento nuestro asistente no está disponible. Contacta con nosotros directamente y te atenderemos enseguida.";

/**
 * Full inbound message pipeline.
 *  1. Identify business by inbound Twilio number.
 *  2. Persist inbound message.
 *  3. Classify intent.
 *  4. Build system prompt from business context.
 *  5. Generate reply with Claude (or plan-limit fallback).
 *  6. Persist outbound message.
 *  7. Update conversation status + counters.
 */
export async function runInboundPipeline(m: IncomingMessage): Promise<PipelineResult> {
  const supa = createAdminClient();
  const businessPhone = m.toWhatsApp.replace(/^whatsapp:/, "");
  const customerPhone = m.fromWhatsApp.replace(/^whatsapp:/, "");

  let businessQuery = supa.from("businesses").select("*, business_settings(*)");
  if (m.metaPhoneNumberId) {
    businessQuery = businessQuery.eq("meta_phone_number_id", m.metaPhoneNumberId);
  } else {
    businessQuery = businessQuery.eq("twilio_whatsapp_number", businessPhone);
  }
  const { data: business, error: bizErr } = await businessQuery.maybeSingle();
  if (bizErr || !business) return { ok: false, reason: "no_business" };

  // Reject silently if the subscription was cancelled.
  // billing_active defaults to true so existing businesses without the column are unaffected.
  if (business.billing_active === false) {
    return { ok: false, reason: "billing_inactive", replyText: BILLING_INACTIVE_FALLBACK_ES };
  }

  // Conversation: upsert by (business_id, customer_phone) to avoid race conditions
  // when two simultaneous inbound messages from the same customer both try to INSERT.
  const { data: convo } = await supa
    .from("conversations")
    .upsert(
      {
        business_id: business.id,
        customer_phone: customerPhone,
        customer_name: m.profileName ?? null,
        status: "active",
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "business_id,customer_phone" }
    )
    .select("*")
    .single();
  if (!convo) return { ok: false, reason: "error" };

  // Notify business owner only when the conversation was just created (created_at within last 3 s).
  const isNewConversation = Date.now() - new Date(convo.created_at).getTime() < 3000;
  if (isNewConversation) {
    const bizSettings = Array.isArray(business.business_settings)
      ? business.business_settings[0]
      : business.business_settings;
    if (bizSettings?.notification_email) {
      sendNewLeadNotification({
        to: bizSettings.notification_email,
        businessName: business.name,
        customerName: m.profileName ?? null,
        customerPhone,
        conversationId: convo.id,
      }).catch(() => {});
    }
  }

  // Slot selection interception: if the customer replies 1/2/3 and we have pending slots.
  const trimmed = m.body.trim();
  if (convo.pending_slots && /^[123]$/.test(trimmed)) {
    const idx = parseInt(trimmed, 10) - 1;
    const slots: string[] = Array.isArray(convo.pending_slots)
      ? (convo.pending_slots as unknown[]).filter((s): s is string => typeof s === "string")
      : [];
    if (slots[idx]) {
      const appt = await createAppointment({
        businessId: business.id,
        conversationId: convo.id,
        customerPhone,
        customerName: convo.customer_name,
        serviceId: convo.pending_service_id ?? null,
        scheduledAt: new Date(slots[idx]),
        durationMinutes: 30,
      });
      await supa
        .from("conversations")
        .update({ pending_slots: null, pending_service_id: null })
        .eq("id", convo.id);
      const { format } = await import("date-fns");
      const { es } = await import("date-fns/locale");
      const confirmText = `¡Perfecto! Tu cita está confirmada para el ${format(new Date(slots[idx]), "EEEE d 'de' LLLL 'a las' HH:mm", { locale: es })}.`;
      await supa.from("messages").insert({
        conversation_id: convo.id,
        business_id: business.id,
        direction: "outbound",
        content: confirmText,
        metadata: { source: "slot_confirmation", appointment_id: appt?.id ?? null },
      });
      return {
        ok: true,
        replyText: confirmText,
        conversationId: convo.id,
        intent: "appointment_request",
        appointmentRequested: false,
      };
    }
  }

  // Intent classification (best-effort, swallow errors and default to unknown).
  let intent: Intent = "unknown";
  try { intent = await classifyIntent(m.body); } catch { /* ignore */ }

  // Store inbound.
  await supa.from("messages").insert({
    conversation_id: convo.id,
    business_id: business.id,
    direction: "inbound",
    content: m.body,
    metadata: { intent, profile_name: m.profileName ?? null },
  });

  // Plan-limit check.
  const limit = PLAN_LIMITS[(business.plan as Plan) ?? "starter"];
  if (Number.isFinite(limit) && business.ai_responses_this_month >= limit) {
    await supa.from("messages").insert({
      conversation_id: convo.id,
      business_id: business.id,
      direction: "outbound",
      content: PLAN_LIMIT_FALLBACK_ES,
      metadata: { reason: "plan_limit_reached" },
    });
    await supa.from("conversations").update({
      last_message_at: new Date().toISOString(),
      status: "lead",
    }).eq("id", convo.id);
    return { ok: false, reason: "plan_limit_reached", replyText: PLAN_LIMIT_FALLBACK_ES };
  }

  // Load context.
  const [{ data: services }, { data: hours }] = await Promise.all([
    supa.from("services").select("*").eq("business_id", business.id).eq("active", true),
    supa.from("business_hours").select("*").eq("business_id", business.id),
  ]);

  const settings = Array.isArray(business.business_settings)
    ? business.business_settings[0]
    : business.business_settings;

  const systemPrompt = buildSystemPrompt({
    businessName: business.name,
    aiName: settings?.ai_name ?? "Sofía",
    tone: settings?.tone ?? "friendly",
    customInstructions: settings?.custom_instructions ?? null,
    services: services ?? [],
    hours: hours ?? [],
    address: business.address,
    googleMapsUrl: business.google_maps_url,
    customerName: convo.customer_name,
  });

  // Last 20 messages, ascending.
  const { data: recent } = await supa
    .from("messages")
    .select("direction, content")
    .eq("conversation_id", convo.id)
    .order("sent_at", { ascending: false })
    .limit(20);
  const history = (recent ?? [])
    .reverse()
    .map((r) => ({ role: r.direction === "inbound" ? "user" as const : "assistant" as const, content: r.content }));

  let replyText: string;
  try {
    replyText = await generateReply(systemPrompt, history);
  } catch {
    replyText =
      "Disculpa, estamos teniendo un problema técnico. Un miembro del equipo te responderá en breve.";
  }

  // Persist outbound.
  await supa.from("messages").insert({
    conversation_id: convo.id,
    business_id: business.id,
    direction: "outbound",
    content: replyText,
    metadata: { intent, model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5" },
  });

  // Update counters + status.
  const newStatus = intent === "appointment_request" ? "lead" : convo.status === "active" ? "lead" : convo.status;
  await supa.from("conversations").update({
    last_message_at: new Date().toISOString(),
    status: newStatus,
  }).eq("id", convo.id);
  await supa
    .from("businesses")
    .update({ ai_responses_this_month: (business.ai_responses_this_month ?? 0) + 1 })
    .eq("id", business.id);

  return {
    ok: true,
    replyText,
    conversationId: convo.id,
    intent,
    appointmentRequested: intent === "appointment_request",
  };
}
