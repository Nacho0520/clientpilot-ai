"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBusinessSettings(fd: FormData) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;

  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return;

  await supa.from("businesses").update({
    name: fd.get("name") as string,
    phone: fd.get("phone") as string,
    address: fd.get("address") as string,
    google_maps_url: fd.get("google_maps_url") as string || null,
  }).eq("id", biz.id);

  await supa.from("business_settings").upsert({
    business_id: biz.id,
    ai_name: fd.get("ai_name") as string,
    tone: fd.get("tone") as string,
    custom_instructions: fd.get("custom_instructions") as string || null,
    review_link_url: fd.get("review_link_url") as string || null,
    notification_email: fd.get("notification_email") as string || null,
  }, { onConflict: "business_id" });

  revalidatePath("/dashboard/settings");
}

export async function saveService(fd: FormData) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return;

  const id = fd.get("id") as string | null;
  const payload = {
    business_id: biz.id,
    name: fd.get("name") as string,
    description: (fd.get("description") as string) || null,
    price_cents: Math.round(parseFloat(fd.get("price") as string) * 100),
    duration_minutes: parseInt(fd.get("duration") as string, 10),
    active: true,
  };

  if (id) {
    await supa.from("services").update(payload).eq("id", id).eq("business_id", biz.id);
  } else {
    await supa.from("services").insert(payload);
  }
  revalidatePath("/dashboard/settings");
}

export async function deleteService(id: string) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return;
  await supa.from("services").delete().eq("id", id).eq("business_id", biz.id);
  revalidatePath("/dashboard/settings");
}

export async function saveHours(fd: FormData) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return;

  const upserts = Array.from({ length: 7 }, (_, i) => ({
    business_id: biz.id,
    day_of_week: i,
    open_time: fd.get(`open_time_${i}`) as string || null,
    close_time: fd.get(`close_${i}`) as string || null,
    closed: fd.get(`open_${i}`) !== "true",
  }));

  await supa.from("business_hours").upsert(upserts, { onConflict: "business_id,day_of_week" });
  revalidatePath("/dashboard/settings");
}

export async function saveWhatsAppNumberForm(fd: FormData): Promise<void> {
  await saveWhatsAppNumber(fd);
}

export async function saveMetaProviderForm(fd: FormData): Promise<void> {
  await saveMetaProvider(fd);
}

export async function saveWhatsAppNumber(fd: FormData): Promise<{ error?: string; success?: boolean }> {
  const number = (fd.get("whatsapp_number") as string)?.trim();
  if (!number || !/^\+\d{7,15}$/.test(number)) {
    return { error: "Formato inválido. Usa +34XXXXXXXXX" };
  }
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return { error: "Negocio no encontrado" };
  const { error } = await supa
    .from("businesses")
    .update({ twilio_whatsapp_number: number, whatsapp_provider: "twilio" })
    .eq("id", biz.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function saveMetaProvider(fd: FormData): Promise<{ error?: string; success?: boolean }> {
  const phoneNumberId = (fd.get("meta_phone_number_id") as string)?.trim();
  const wabaId = (fd.get("meta_waba_id") as string)?.trim();
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!biz) return { error: "Negocio no encontrado" };
  const { error } = await supa
    .from("businesses")
    .update({ whatsapp_provider: "meta", meta_phone_number_id: phoneNumberId, meta_waba_id: wabaId })
    .eq("id", biz.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true };
}
