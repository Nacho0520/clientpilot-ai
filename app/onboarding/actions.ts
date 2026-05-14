"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureServerEvent, identifyServer } from "@/lib/posthog";

type Args = {
  step: number;
  name: string; phone: string; address: string; sector: string; googleMapsUrl: string;
  services: Array<{ name: string; price: string; duration: string }>;
  hours: Array<{ day: number; open: string; close: string; closed: boolean }>;
  aiName: string; tone: string; customInstr: string;
};

type SupabaseMutationResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

function assertSupabaseSuccess<T>(
  result: SupabaseMutationResult<T>,
  operation: string
): T {
  if (result.error) {
    throw new Error(`${operation}: ${result.error.message}`);
  }
  if (!result.data) {
    throw new Error(`${operation}: Supabase did not return a row`);
  }
  return result.data;
}

function assertSupabaseWrite(
  result: { error: { message: string } | null },
  operation: string
) {
  if (result.error) {
    throw new Error(`${operation}: ${result.error.message}`);
  }
}

export async function saveOnboardingStep(args: Args) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const existingBusiness = await admin.from("businesses").select("*").eq("owner_id", user.id).maybeSingle();
  if (existingBusiness.error) {
    throw new Error(`Load business: ${existingBusiness.error.message}`);
  }
  let business = existingBusiness.data;

  if (args.step === 0) {
    if (!business) {
      business = assertSupabaseSuccess(
        await admin
          .from("businesses")
          .insert({
            owner_id: user.id,
            name: args.name,
            phone: args.phone,
            address: args.address,
            sector: args.sector,
            google_maps_url: args.googleMapsUrl || null,
          })
          .select()
          .single(),
        "Create business"
      );
      assertSupabaseWrite(
        await admin.from("business_settings").upsert({
          business_id: business.id,
          ai_name: args.aiName,
          tone: args.tone,
        }, { onConflict: "business_id" }),
        "Create business settings"
      );
    } else {
      assertSupabaseWrite(
        await admin.from("businesses").update({
          name: args.name, phone: args.phone, address: args.address, sector: args.sector,
          google_maps_url: args.googleMapsUrl || null,
        }).eq("id", business.id),
        "Update business"
      );
    }
    return;
  }

  if (!business) throw new Error("Business not found");

  if (args.step === 1) {
    assertSupabaseWrite(
      await admin.from("services").delete().eq("business_id", business.id),
      "Delete services"
    );
    const rows = args.services
      .filter((s) => s.name && s.price)
      .map((s) => ({
        business_id: business.id,
        name: s.name,
        price_cents: Math.round(parseFloat(s.price) * 100),
        duration_minutes: parseInt(s.duration || "30", 10),
      }));
    if (rows.length) {
      assertSupabaseWrite(await admin.from("services").insert(rows), "Create services");
    }
  }

  if (args.step === 2) {
    assertSupabaseWrite(
      await admin.from("business_hours").delete().eq("business_id", business.id),
      "Delete business hours"
    );
    const rows = args.hours.map((h) => ({
      business_id: business.id,
      day_of_week: h.day,
      open_time: h.closed ? null : `${h.open}:00`,
      close_time: h.closed ? null : `${h.close}:00`,
      closed: h.closed,
    }));
    assertSupabaseWrite(await admin.from("business_hours").insert(rows), "Create business hours");
  }

  if (args.step === 3) {
    assertSupabaseWrite(
      await admin.from("business_settings").upsert({
        business_id: business.id,
        ai_name: args.aiName,
        tone: args.tone,
        custom_instructions: args.customInstr || null,
      }, { onConflict: "business_id" }),
      "Update business settings"
    );
  }
}

export async function saveOnboardingWhatsApp(args: {
  provider: "twilio" | "meta";
  twilioNumber?: string;
  metaPhoneNumberId?: string;
  metaWabaId?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (!business) return { error: "Negocio no encontrado" };

  if (args.provider === "twilio") {
    if (!args.twilioNumber || !/^\+\d{7,15}$/.test(args.twilioNumber)) {
      return { error: "Formato inválido. Usa +34XXXXXXXXX" };
    }
    assertSupabaseWrite(
      await admin.from("businesses").update({ twilio_whatsapp_number: args.twilioNumber, whatsapp_provider: "twilio" }).eq("id", business.id),
      "Save twilio number"
    );
  } else {
    if (!args.metaPhoneNumberId || !/^\d{10,20}$/.test(args.metaPhoneNumberId.trim())) {
      return { error: "Phone Number ID inválido. Debe ser un número de 10–20 dígitos." };
    }
    if (!args.metaWabaId || !/^\d{10,20}$/.test(args.metaWabaId.trim())) {
      return { error: "WABA ID inválido. Debe ser un número de 10–20 dígitos." };
    }
    assertSupabaseWrite(
      await admin.from("businesses").update({
        whatsapp_provider: "meta",
        meta_phone_number_id: args.metaPhoneNumberId.trim(),
        meta_waba_id: args.metaWabaId.trim(),
      }).eq("id", business.id),
      "Save meta config"
    );
  }
  return { success: true };
}

export async function completeOnboarding() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const admin = createAdminClient();
  assertSupabaseWrite(
    await admin.from("businesses").update({ onboarding_complete: true }).eq("owner_id", user.id),
    "Complete onboarding"
  );
  const { data: biz } = await admin.from("businesses").select("id, name, sector").eq("owner_id", user.id).maybeSingle();
  if (biz) {
    identifyServer(user.id, { email: user.email ?? "", business_name: biz.name, sector: biz.sector ?? "" });
    captureServerEvent("onboarding_completed", user.id, { business_id: biz.id, sector: biz.sector ?? "" });
  }
}
