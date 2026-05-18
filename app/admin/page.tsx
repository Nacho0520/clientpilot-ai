import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format-date";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subDays } from "date-fns";
import type { ComponentProps } from "react";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

export default async function AdminOverview() {
  await requireAdmin();
  const supa = createAdminClient();

  const since7d = subDays(new Date(), 7).toISOString();

  const [
    { count: totalBusinesses },
    { count: newBusinesses7d },
    { count: totalConvos },
    { count: newConvos7d },
    { count: totalAppts },
    { data: planDist },
    { data: recentBiz },
    { data: topActive },
  ] = await Promise.all([
    supa.from("businesses").select("*", { count: "exact", head: true }),
    supa.from("businesses").select("*", { count: "exact", head: true }).gte("created_at", since7d),
    supa.from("conversations").select("*", { count: "exact", head: true }),
    supa.from("conversations").select("*", { count: "exact", head: true }).gte("created_at", since7d),
    supa.from("appointments").select("*", { count: "exact", head: true }).in("status", ["confirmed", "completed"]),
    supa.from("businesses").select("plan"),
    supa.from("businesses").select("id, name, plan, created_at, onboarding_complete, ai_responses_this_month").order("created_at", { ascending: false }).limit(8),
    supa.from("businesses").select("id, name, ai_responses_this_month, plan").order("ai_responses_this_month", { ascending: false }).limit(5),
  ]);

  const planCounts = { starter: 0, pro: 0, clinic: 0 };
  for (const b of planDist ?? []) {
    if (b.plan in planCounts) planCounts[b.plan as keyof typeof planCounts]++;
  }

  const PLAN_COLORS: Record<string, BadgeVariant> = {
    starter: "secondary",
    pro: "default",
    clinic: "success",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Panel de administración</h1>
        <p className="text-muted-foreground mt-1">Vista global de ClientPilot AI</p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Negocios totales</CardDescription>
            <CardTitle className="text-3xl">{totalBusinesses ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-emerald-600">+{newBusinesses7d ?? 0} esta semana</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Conversaciones totales</CardDescription>
            <CardTitle className="text-3xl">{totalConvos ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-emerald-600">+{newConvos7d ?? 0} esta semana</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Citas confirmadas</CardDescription>
            <CardTitle className="text-3xl">{totalAppts ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">histórico total</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Distribución de planes</CardDescription>
            <CardTitle className="text-lg mt-1 flex gap-2 flex-wrap">
              {Object.entries(planCounts).map(([plan, count]) => (
                <span key={plan} className="flex items-center gap-1 text-sm font-normal">
                  <Badge variant={PLAN_COLORS[plan]}>{plan}</Badge> {count}
                </span>
              ))}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{totalBusinesses} negocios en total</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent signups */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos registros</CardTitle>
            <CardDescription>Los negocios más recientes</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {recentBiz?.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(b.created_at)}
                    {!b.onboarding_complete && <span className="ml-2 text-amber-600">· Onboarding incompleto</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <Badge variant={PLAN_COLORS[b.plan]}>{b.plan}</Badge>
                  <span className="text-xs text-muted-foreground">{b.ai_responses_this_month} resp.</span>
                </div>
              </div>
            ))}
            {!recentBiz?.length && <p className="text-sm text-muted-foreground py-4">Aún no hay negocios registrados.</p>}
          </CardContent>
        </Card>

        {/* Top by usage */}
        <Card>
          <CardHeader>
            <CardTitle>Top uso de IA</CardTitle>
            <CardDescription>Negocios con más respuestas IA este mes</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {topActive?.map((b, idx) => (
              <div key={b.id} className="flex items-center gap-3 py-3">
                <span className="text-lg font-semibold text-muted-foreground w-6">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{b.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (b.ai_responses_this_month / (topActive[0]?.ai_responses_this_month || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold shrink-0">{b.ai_responses_this_month}</span>
              </div>
            ))}
            {!topActive?.length && <p className="text-sm text-muted-foreground py-4">Sin datos de uso aún.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
