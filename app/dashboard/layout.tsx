import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { PLAN_LIMITS } from "@/lib/env";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");

  const { data: biz } = await supa
    .from("businesses")
    .select("name, plan, onboarding_complete, ai_responses_this_month")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!biz?.onboarding_complete) redirect("/onboarding");

  const planLimit = Number.isFinite(PLAN_LIMITS[biz.plan as keyof typeof PLAN_LIMITS])
    ? PLAN_LIMITS[biz.plan as keyof typeof PLAN_LIMITS]
    : null;

  const isAdmin = user.email === "hemmings.nacho@gmail.com";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav bizName={biz.name} />
      <div className="hidden md:flex">
        <DashboardSidebar
          bizName={biz.name}
          plan={biz.plan ?? "starter"}
          aiResponsesThisMonth={biz.ai_responses_this_month ?? 0}
          planLimit={planLimit}
          isAdmin={isAdmin}
        />
      </div>
      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
