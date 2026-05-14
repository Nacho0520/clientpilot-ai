import { addDays, addMinutes, format, isBefore, parse, startOfDay } from "date-fns";
import { createAdminClient } from "../supabase/admin";
import { calendarClientFromTokens } from "./google";

/** Look at the next 7 days, return up to 3 free slots that fit the business hours. */
export async function proposeSlotsForConversation(
  conversationId: string,
  serviceId?: string | null
): Promise<{ text: string; slots: Date[] } | null> {
  const supa = createAdminClient();
  const { data: convo } = await supa.from("conversations").select("business_id").eq("id", conversationId).single();
  if (!convo) return null;

  const { data: business } = await supa
    .from("businesses")
    .select("id, google_oauth_tokens_encrypted")
    .eq("id", convo.business_id)
    .single();
  if (!business?.google_oauth_tokens_encrypted) {
    return { text: "He registrado tu interés. Un miembro del equipo te confirmará un hueco en breve.", slots: [] };
  }

  const { data: hours } = await supa.from("business_hours").select("*").eq("business_id", convo.business_id);

  const now = new Date();
  let busy: { start: Date; end: Date }[] = [];
  try {
    const cal = calendarClientFromTokens(business.google_oauth_tokens_encrypted);
    const horizonEnd = addDays(now, 7);
    const fb = await cal.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: horizonEnd.toISOString(),
        items: [{ id: "primary" }],
      },
    });
    busy = (fb.data.calendars?.primary?.busy ?? []).map((b) => ({
      start: new Date(b.start!),
      end: new Date(b.end!),
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/invalid_grant|token has been expired or revoked/i.test(msg)) {
      await supa
        .from("businesses")
        .update({ google_oauth_invalid: true })
        .eq("id", business.id);
      return { text: "He registrado tu interés. Un miembro del equipo te confirmará un hueco en breve.", slots: [] };
    }
    throw err;
  }

  const slots: Date[] = [];
  const slotDurationMin = 30;
  for (let d = 0; d < 7 && slots.length < 3; d++) {
    const day = startOfDay(addDays(now, d));
    const dow = day.getDay();
    const h = hours?.find((x) => x.day_of_week === dow);
    if (!h || h.closed || !h.open_time || !h.close_time) continue;
    const open = parse(h.open_time, "HH:mm:ss", day);
    const close = parse(h.close_time, "HH:mm:ss", day);
    let cursor = isBefore(open, now) ? new Date(Math.ceil(now.getTime() / (30 * 60 * 1000)) * 30 * 60 * 1000) : open;
    while (isBefore(cursor, close) && slots.length < 3) {
      const end = addMinutes(cursor, slotDurationMin);
      if (isBefore(end, close) || end.getTime() === close.getTime()) {
        const overlap = busy.some((b) => cursor < b.end && end > b.start);
        if (!overlap) slots.push(new Date(cursor));
      }
      cursor = addMinutes(cursor, slotDurationMin);
    }
  }

  if (!slots.length) {
    return { text: "Esta semana no tenemos huecos disponibles. ¿Te viene bien la siguiente?", slots: [] };
  }
  const lines = slots
    .map((s, i) => `${i + 1}. ${format(s, "EEEE d 'de' LLLL 'a las' HH:mm")}`)
    .join("\n");
  const text = `Estos son los huecos más próximos:\n${lines}\n\nResponde con el número de tu preferencia (1, 2 o 3) y confirmamos la cita.`;

  // Persist slots so the pipeline can intercept the reply.
  await supa
    .from("conversations")
    .update({
      pending_slots: slots.map((s) => s.toISOString()),
      pending_service_id: serviceId ?? null,
    })
    .eq("id", conversationId);

  return { text, slots };
}

export async function createAppointment(args: {
  businessId: string;
  conversationId: string;
  customerPhone: string;
  customerName: string | null;
  serviceId: string | null;
  scheduledAt: Date;
  durationMinutes: number;
}) {
  const supa = createAdminClient();
  const { data: business } = await supa
    .from("businesses")
    .select("id, name, address, google_oauth_tokens_encrypted")
    .eq("id", args.businessId)
    .single();

  let googleEventId: string | null = null;
  if (business?.google_oauth_tokens_encrypted) {
    const cal = calendarClientFromTokens(business.google_oauth_tokens_encrypted);
    const end = new Date(args.scheduledAt.getTime() + args.durationMinutes * 60 * 1000);
    const ev = await cal.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Cita: ${args.customerName ?? args.customerPhone}`,
        description: `Cliente: ${args.customerName ?? "—"}\nTel: ${args.customerPhone}`,
        location: business.address ?? undefined,
        start: { dateTime: args.scheduledAt.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });
    googleEventId = ev.data.id ?? null;
  }

  const { data: appt } = await supa
    .from("appointments")
    .insert({
      business_id: args.businessId,
      conversation_id: args.conversationId,
      customer_phone: args.customerPhone,
      customer_name: args.customerName,
      service_id: args.serviceId,
      scheduled_at: args.scheduledAt.toISOString(),
      duration_minutes: args.durationMinutes,
      status: "confirmed",
      google_event_id: googleEventId,
    })
    .select()
    .single();

  await supa.from("conversations").update({ status: "converted" }).eq("id", args.conversationId);
  return appt;
}
