import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "./wizard";

export const metadata: Metadata = {
  title: "Configuración inicial — ClientPilot AI",
  description: "Configura tu recepcionista IA en WhatsApp en menos de 15 minutos.",
};

export default async function OnboardingPage() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supa
    .from("businesses")
    .select("*, business_settings(*), services(*), business_hours(*)")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (business?.onboarding_complete) redirect("/dashboard");
  return <OnboardingWizard initialBusiness={business} />;
}
