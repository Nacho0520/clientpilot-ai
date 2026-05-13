import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warn"> = {
  active: "default", lead: "warn", converted: "success", closed: "secondary", cold: "secondary",
};

const PAGE_SIZE = 20;

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status, q, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;

  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  const { data: biz } = await supa.from("businesses").select("id").eq("owner_id", user!.id).single();

  let query = supa
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("business_id", biz!.id)
    .order("last_message_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);
  if (q) query = query.or(`customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);

  const { data: conversations, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { status, q, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/dashboard/conversations?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Conversaciones</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <form method="get" action="/dashboard/conversations" className="flex gap-2 flex-1 min-w-0">
          {status && <input type="hidden" name="status" value={status} />}
          <Input name="q" defaultValue={q ?? ""} placeholder="Buscar por nombre o teléfono..." className="max-w-xs" />
          <Button type="submit" variant="outline" size="sm">Buscar</Button>
          {q && <Link href={buildHref({ q: undefined, page: "1" })}><Button variant="ghost" size="sm">Limpiar</Button></Link>}
        </form>
      </div>

      <div className="mb-4 flex gap-2 text-sm flex-wrap">
        {["all", "active", "lead", "converted", "cold"].map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s === "all" ? undefined : s, page: "1" })}
            className={`rounded border px-3 py-1 transition-colors ${
              (status ?? "all") === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"
            }`}
          >
            {s === "all" ? "Todas" : s}
          </Link>
        ))}
      </div>

      {/* Results */}
      {!conversations?.length && (
        <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
          <svg className="mb-4 h-12 w-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="font-medium">No hay conversaciones {q ? `que coincidan con "${q}"` : "aún"}</p>
          {q && <Link href={buildHref({ q: undefined, page: "1" })} className="mt-2 text-sm underline">Ver todas</Link>}
        </div>
      )}

      <div className="space-y-2">
        {conversations?.map((c) => (
          <Link key={c.id} href={`/dashboard/conversations/${c.id}`}>
            <Card className="transition hover:bg-secondary/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{c.customer_name ?? c.customer_phone}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {c.customer_phone} · {new Date(c.last_message_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[c.status] ?? "default"}>{c.status}</Badge>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link href={buildHref({ page: String(page - 1) })}>
            <Button variant="outline" size="sm" disabled={page <= 1}>← Anterior</Button>
          </Link>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Link href={buildHref({ page: String(page + 1) })}>
            <Button variant="outline" size="sm" disabled={page >= totalPages}>Siguiente →</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
