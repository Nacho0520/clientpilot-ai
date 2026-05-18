import { sendMetaMessage } from "./meta";

async function getBusinessProvider(businessId: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supa = createAdminClient();
  const { data } = await supa
    .from("businesses")
    .select("whatsapp_provider, meta_phone_number_id, twilio_whatsapp_number")
    .eq("id", businessId)
    .single();
  return data;
}

export async function sendWhatsApp(to: string, body: string, businessId: string): Promise<void> {
  const biz = await getBusinessProvider(businessId);
  if (!biz) throw new Error(`Business ${businessId} not found`);

  if (biz.whatsapp_provider === "meta") {
    if (!biz.meta_phone_number_id) throw new Error("meta_phone_number_id not configured");
    return sendMetaMessage(to, body, biz.meta_phone_number_id);
  }

  // Twilio fallback
  const { sendWhatsApp: sendTwilio } = await import("@/lib/twilio");
  await sendTwilio(to, body, biz.twilio_whatsapp_number ?? undefined);
}
