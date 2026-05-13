import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "./wizard";

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
