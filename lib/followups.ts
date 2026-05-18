import { createAdminClient } from "./supabase/admin";
import { sendWhatsApp } from "./whatsapp/send";
import type { Database } from "./supabase/database.types";

const TEMPLATES = {
  follow_up_a: (name: string | null) =>
    `Hola${name ? ` ${name}` : ""}, queríamos saber si pudimos ayudarte. ¿Te gustaría reservar tu cita esta semana?`,
  follow_up_b: (name: string | null) =>
    `Hola${name ? ` ${name}` : ""}, ¿tienes alguna duda que podamos resolver? Tenemos disponibilidad esta semana.`,
  follow_up_c: (name: string | null) =>
    `Hola${name ? ` ${name}` : ""}, tu consulta sigue pendiente. ¿Te reservamos un hueco esta semana?`,
  review_request: (name: string | null, link: string | null) =>
    `Hola${name ? ` ${name}` : ""}, esperamos que tu visita haya sido perfecta. ¿Nos dejarías una reseña en Google?${link ? ` ${link}` : ""}`,
  reminder_24h: (name: string | null, when: string) =>
    `Hola${name ? ` ${name}` : ""}, te recordamos tu cita: ${when}. ¡Te esperamos!`,
};

type BusinessSettingsRow = Database["public"]["Tables"]["business_settings"]["Row"];
type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type FollowUpQueueRow = Database["public"]["Tables"]["follow_up_queue"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

// Join shape: businesses with a nested business_settings projection (1-to-1 relation).
type WhatsAppBusiness = Pick<BusinessRow, "twilio_whatsapp_number"> & {
  business_settings?:
    | Pick<BusinessSettingsRow, "review_link_url">
    | Pick<BusinessSettingsRow, "review_link_url">[]
    | null;
};

// Join shape: conversation row with nested businesses join.
type FollowUpConversation = Pick<
  ConversationRow,
  "id" | "business_id" | "customer_phone" | "customer_name" | "follow_ups_sent"
> & {
  businesses?: WhatsAppBusiness | null;
};

// Join shape: follow_up_queue row with nested conversations join.
type FollowUpQueueItem = Pick<FollowUpQueueRow, "id" | "template_type"> & {
  conversations?: FollowUpConversation | null;
};

// Join shape: appointments row with nested businesses and conversations joins.
type ReminderAppointment = AppointmentRow & {
  businesses?: WhatsAppBusiness | null;
  conversations?: Pick<ConversationRow, "customer_name"> | null;
};

/** Scan: leads inactive >24h with no appointment get queued for follow-up. */
export async function scanForFollowUps() {
  const supa = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: candidates } = await supa
    .from("conversations")
    .select("id, business_id, follow_ups_sent, last_message_at, customer_phone")
    .eq("status", "lead")
    .lte("last_message_at", cutoff);

  if (!candidates) return 0;
  const results = await Promise.all(
    candidates
      .map(async (c) => {
        if (c.follow_ups_sent >= 2) return 0;
        const [{ data: appt }, { data: pending }] = await Promise.all([
          supa
            .from("appointments")
            .select("id")
            .eq("conversation_id", c.id)
            .in("status", ["pending", "confirmed"])
            .maybeSingle(),
          supa
            .from("follow_up_queue")
            .select("id")
            .eq("conversation_id", c.id)
            .eq("status", "pending")
            .maybeSingle(),
        ]);
        if (appt || pending) return 0;

        const templates = ["follow_up_a", "follow_up_b", "follow_up_c"] as const;
        const tpl = templates[Math.floor(Math.random() * templates.length)];
        await supa.from("follow_up_queue").insert({
          business_id: c.business_id,
          conversation_id: c.id,
          scheduled_at: new Date().toISOString(),
          template_type: tpl,
          status: "pending",
        });
        return 1;
      })
  );
  return results.reduce<number>((sum, n) => sum + n, 0);
}

/** Send all pending follow-ups whose scheduled_at <= now. */
export async function sendDueFollowUps() {
  const supa = createAdminClient();
  const { data: due } = await supa
    .from("follow_up_queue")
    .select("*, conversations(*, businesses(twilio_whatsapp_number, business_settings(review_link_url)))")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(100);
  if (!due) return 0;

  const results = await Promise.all(
    (due as FollowUpQueueItem[]).map(async (item) => {
      const convo = item.conversations;
      if (!convo) return 0;
      const biz = convo.businesses;
      if (!biz) return 0;
      const settings = Array.isArray(biz.business_settings) ? biz.business_settings[0] : biz.business_settings;

      const body = (() => {
        switch (item.template_type) {
          case "follow_up_a": return TEMPLATES.follow_up_a(convo.customer_name);
          case "follow_up_b": return TEMPLATES.follow_up_b(convo.customer_name);
          case "follow_up_c": return TEMPLATES.follow_up_c(convo.customer_name);
          case "review_request": return TEMPLATES.review_request(convo.customer_name, settings?.review_link_url ?? null);
          default: return null;
        }
      })();
      if (!body) return 0;

      try {
        await sendWhatsApp(convo.customer_phone, body, convo.business_id);
        await Promise.all([
          supa.from("messages").insert({
            conversation_id: convo.id,
            business_id: convo.business_id,
            direction: "outbound",
            content: body,
            metadata: { source: "follow_up", template: item.template_type },
          }),
          supa.from("follow_up_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", item.id),
          supa.from("conversations").update({
            follow_ups_sent: (convo.follow_ups_sent ?? 0) + 1,
            last_message_at: new Date().toISOString(),
          }).eq("id", convo.id),
        ]);
        return 1;
      } catch (e) {
        console.error("Follow-up send failed", e);
        await supa.from("follow_up_queue").update({ status: "failed" }).eq("id", item.id);
        return 0;
      }
    })
  );
  return results.reduce<number>((sum, n) => sum + n, 0);
}

/** Send appointment reminder + persist outbound message. */
export async function sendReminder(appointmentId: string) {
  const supa = createAdminClient();
  const { data: appt } = await supa
    .from("appointments")
    .select("*, businesses(twilio_whatsapp_number), conversations(customer_name)")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || appt.status !== "confirmed") return;
  const when = new Date(appt.scheduled_at).toLocaleString("es-ES", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
  const body = TEMPLATES.reminder_24h((appt as ReminderAppointment).conversations?.customer_name ?? appt.customer_name, when);
  await sendWhatsApp(appt.customer_phone, body, appt.business_id);
  if (appt.conversation_id) {
    await supa.from("messages").insert({
      conversation_id: appt.conversation_id,
      business_id: appt.business_id,
      direction: "outbound",
      content: body,
      metadata: { source: "reminder_24h", appointment_id: appt.id },
    });
  }
}

export async function sendReviewRequest(appointmentId: string) {
  const supa = createAdminClient();
  const { data: appt } = await supa
    .from("appointments")
    .select("*, businesses(twilio_whatsapp_number, business_settings(review_link_url))")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return;
  const biz = (appt as ReminderAppointment).businesses;
  const settings = Array.isArray(biz?.business_settings) ? biz?.business_settings[0] : biz?.business_settings;
  const body = TEMPLATES.review_request(appt.customer_name, settings?.review_link_url ?? null);
  await sendWhatsApp(appt.customer_phone, body, appt.business_id);
  if (appt.conversation_id) {
    await supa.from("messages").insert({
      conversation_id: appt.conversation_id,
      business_id: appt.business_id,
      direction: "outbound",
      content: body,
      metadata: { source: "review_request", appointment_id: appt.id },
    });
  }
}
