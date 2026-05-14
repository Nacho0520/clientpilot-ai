import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { IntegrationStatus } from "@/components/dashboard/integration-status";
import { subDays, format } from "date-fns";

function fmtEuros(c: number) { return `${(c / 100).toFixed(2)} €`; }

export default async function DashboardOverview() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  const { data: biz } = await supa
    .from("businesses")
    .select("id, name, plan, ai_responses_this_month, google_oauth_tokens_encrypted, twilio_whatsapp_number, meta_phone_number_id, whatsapp_provider, billing_active")
    .eq("owner_id", user!.id)
    .single();

  if (!biz) {
    return (
      <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
        <p className="font-medium">No se encontró ningún negocio asociado a tu cuenta.</p>
        <p className="text-sm mt-1">Completa el proceso de <a href="/onboarding" className="underline">onboarding</a> para continuar.</p>
      </div>
    );
  }

  const since = subDays(new Date(), 30).toISOString();

  const [{ count: leads }, { count: appts }, { data: msgs }, { count: follows }] = await Promise.all([
    supa.from("conversations").select("*", { count: "exact", head: true }).eq("business_id", biz!.id).gte("created_at", since),
    supa.from("appointments").select("*", { count: "exact", head: true }).eq("business_id", biz!.id).gte("created_at", since).in("status", ["confirmed", "completed"]),
    supa.from("messages").select("sent_at, direction").eq("business_id", biz!.id).gte("sent_at", since).limit(2000),
    supa.from("follow_up_queue").select("*", { count: "exact", head: true }).eq("business_id", biz!.id).eq("status", "sent").gte("created_at", since),
  ]);

  let totalMs = 0, pairs = 0, lastInbound: number | null = null;
  for (const m of msgs ?? []) {
    const t = new Date(m.sent_at).getTime();
    if (m.direction === "inbound") lastInbound = t;
    else if (lastInbound) { totalMs += t - lastInbound; pairs++; lastInbound = null; }
  }
  const avgSec = pairs ? Math.round((totalMs / pairs) / 1000) : 0;

  const { data: services } = await supa.from("services").select("price_cents").eq("business_id", biz!.id);
  const avgPrice = services?.length ? services.reduce((a, s) => a + s.price_cents, 0) / services.length : 0;
  const recovered = (appts ?? 0) * avgPrice;

  // Build chart data: messages per day for last 14 days
  const chartData = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(new Date(), 13 - i);
    const dayStr = format(day, "dd/MM");
    const count = (msgs ?? []).filter(m => format(new Date(m.sent_at), "dd/MM") === dayStr).length;
    return { day: dayStr, mensajes: count };
  });

  const calendarConnected = !!biz.google_oauth_tokens_encrypted;
  const whatsappConfigured = biz.whatsapp_provider === "twilio"
    ? !!biz.twilio_whatsapp_number
    : !!biz.meta_phone_number_id;
  const billingActive = biz.billing_active !== false;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Resumen — últimos 30 días</h1>

      <IntegrationStatus
        calendarConnected={calendarConnected}
        whatsappConfigured={whatsappConfigured}
        billingActive={billingActive}
        plan={biz.plan ?? "starter"}
      />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card><CardHeader><CardDescription>Leads</CardDescription><CardTitle className="text-2xl">{leads ?? 0}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Citas reservadas</CardDescription><CardTitle className="text-2xl">{appts ?? 0}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Tiempo medio respuesta</CardDescription><CardTitle className="text-2xl">{avgSec ? `${avgSec}s` : "—"}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Follow-ups enviados</CardDescription><CardTitle className="text-2xl">{follows ?? 0}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Ingresos recuperados (est.)</CardDescription><CardTitle className="text-2xl">{fmtEuros(recovered)}</CardTitle></CardHeader></Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader><CardTitle>Actividad — últimos 14 días</CardTitle></CardHeader>
          <CardContent>
            <ActivityChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader><CardTitle>Resumen semanal</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Esta semana respondiste {leads ?? 0} consultas y agendaste {appts ?? 0} citas.
            La IA usó <strong>{biz?.ai_responses_this_month}</strong> respuestas de tu plan <strong>{biz?.plan}</strong>.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
