import { auth } from "@/lib/auth";
import { fmtAppointment } from "@/lib/format-date";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateAppointmentStatus } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warn" | "destructive"> = {
  pending: "warn",
  confirmed: "success",
  completed: "success",
  cancelled: "destructive",
  no_show: "secondary",
};

const STATUS_ES: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No show",
};

// Join shape: appointment row with nested services join.
type AppointmentWithService = {
  services?: Pick<Database["public"]["Tables"]["services"]["Row"], "name"> | null;
};

export default async function AppointmentsPage() {
  const { user, supa } = await auth();
  const { data: appts } = await supa
    .from("appointments")
    .select("*, services(name), businesses!inner(owner_id)")
    .eq("businesses.owner_id", user.id)
    .order("scheduled_at");

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Citas</h1>
      {!appts?.length && (
        <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
          <svg className="mb-4 size-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="font-medium">Aún no hay citas reservadas</p>
          <p className="text-sm mt-1">Las citas que agenda tu IA por WhatsApp aparecerán aquí.</p>
        </div>
      )}
      <div className="space-y-2">
        {appts?.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base">{a.customer_name ?? a.customer_phone}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmtAppointment(a.scheduled_at)}
                  {" · "}{(a as AppointmentWithService).services?.name ?? "Servicio"} ({a.duration_minutes} min)
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={STATUS_VARIANT[a.status] ?? "default"}>{STATUS_ES[a.status] ?? a.status}</Badge>
                {a.status === "pending" && (
                  <>
                    <form action={updateAppointmentStatus.bind(null, a.id, "confirmed")}>
                      <Button type="submit" size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">Confirmar</Button>
                    </form>
                    <form action={updateAppointmentStatus.bind(null, a.id, "cancelled")}>
                      <Button type="submit" size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5">Cancelar</Button>
                    </form>
                  </>
                )}
                {a.status === "confirmed" && (
                  <form action={updateAppointmentStatus.bind(null, a.id, "completed")}>
                    <Button type="submit" size="sm" variant="outline">Marcar completada</Button>
                  </form>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
