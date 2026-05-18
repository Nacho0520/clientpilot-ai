import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { fmtDate } from "@/lib/format-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { changePlan } from "./actions";

const PLAN_COLORS: Record<string, "default" | "secondary" | "success"> = {
  starter: "secondary", pro: "default", clinic: "success",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const supa = createAdminClient();

  let query = supa
    .from("businesses")
    .select("*, business_settings(notification_email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: businesses } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Negocios registrados</h1>
        <span className="text-sm text-muted-foreground">{businesses?.length ?? 0} resultados</span>
      </div>

      <form method="get" action="/admin/users" className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Buscar por nombre..." className="max-w-xs" />
        <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-secondary">Buscar</button>
        {q && <Link href="/admin/users" className="rounded-md border px-3 py-2 text-sm hover:bg-secondary">Limpiar</Link>}
      </form>

      <div className="space-y-2">
        {businesses?.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <Badge variant={PLAN_COLORS[b.plan] ?? "secondary"}>{b.plan}</Badge>
                    {!b.onboarding_complete && <Badge variant="warn">Onboarding incompleto</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {b.phone && <span>{b.phone} · </span>}
                    {b.address && <span>{b.address} · </span>}
                    Registro: {fmtDate(b.created_at)}
                  </p>
                  {b.stripe_customer_id && (
                    <p className="text-xs text-muted-foreground">Stripe: {b.stripe_customer_id}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{b.ai_responses_this_month} resp. IA</p>
                  <p className="text-xs text-muted-foreground">este mes</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form action={changePlan} className="flex items-center gap-2 mt-2">
                <input type="hidden" name="business_id" value={b.id} />
                <select name="plan" defaultValue={b.plan} className="rounded-md border bg-background px-2 py-1 text-xs">
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="clinic">Clinic</option>
                </select>
                <button type="submit" className="rounded-md bg-secondary px-3 py-1 text-xs hover:bg-secondary/80 transition-colors">
                  Cambiar plan
                </button>
              </form>
            </CardContent>
          </Card>
        ))}
        {!businesses?.length && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {q ? `No hay negocios que coincidan con "${q}"` : "Aún no hay negocios registrados."}
          </p>
        )}
      </div>
    </div>
  );
}
