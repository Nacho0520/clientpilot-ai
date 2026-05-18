import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminPlansPage() {
  await requireAdmin();
  const supa = createAdminClient();

  const { data: businesses } = await supa
    .from("businesses")
    .select("plan, ai_responses_this_month, created_at, onboarding_complete, stripe_subscription_id");

  const plans = ["starter", "pro", "clinic"] as const;
  const stats = plans.map((plan) => {
    const biz = (businesses ?? []).filter((b) => b.plan === plan);
    const active = biz.filter((b) => b.onboarding_complete);
    const withStripe = biz.filter((b) => b.stripe_subscription_id);
    const totalResponses = biz.reduce((s, b) => s + (b.ai_responses_this_month ?? 0), 0);
    return { plan, count: biz.length, active: active.length, paying: withStripe.length, totalResponses };
  });

  const PRICES = { starter: 79, pro: 179, clinic: 349 };
  const estimatedMRR = stats.reduce((sum, s) => sum + s.paying * PRICES[s.plan as keyof typeof PRICES], 0);

  const PLAN_COLORS: Record<string, "default" | "secondary" | "success"> = {
    starter: "secondary", pro: "default", clinic: "success",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Gestión de planes</h1>
        <p className="text-muted-foreground mt-1">Distribución y métricas por plan</p>
      </div>

      {/* MRR estimate */}
      <Card className="border-primary">
        <CardHeader>
          <CardDescription>MRR estimado (con Stripe activo)</CardDescription>
          <CardTitle className="text-4xl">{estimatedMRR.toLocaleString("es-ES")} €/mes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Basado en {stats.reduce((s, p) => s + p.paying, 0)} suscripciones activas de Stripe.
        </CardContent>
      </Card>

      {/* Plan breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.plan}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{s.plan}</CardTitle>
                <Badge variant={PLAN_COLORS[s.plan]}>{s.plan}</Badge>
              </div>
              <CardDescription>
                {PRICES[s.plan as keyof typeof PRICES]}€/mes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Negocios registrados</span>
                <span className="font-semibold">{s.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Onboarding completo</span>
                <span className="font-semibold">{s.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Con Stripe activo</span>
                <span className="font-semibold">{s.paying}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resp. IA este mes</span>
                <span className="font-semibold">{s.totalResponses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">MRR estimado</span>
                <span className="font-semibold text-primary">
                  {(s.paying * PRICES[s.plan as keyof typeof PRICES]).toLocaleString("es-ES")} €
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage chart by plan */}
      <Card>
        <CardHeader>
          <CardTitle>Uso de IA por plan (este mes)</CardTitle>
          <CardDescription>Respuestas totales consumidas por todos los negocios de cada plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.map((s) => {
            const total = stats.reduce((sum, p) => sum + p.totalResponses, 0) || 1;
            const pct = Math.round((s.totalResponses / total) * 100);
            return (
              <div key={s.plan} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium">{s.plan}</span>
                  <span className="text-muted-foreground">{s.totalResponses.toLocaleString()} resp. ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
