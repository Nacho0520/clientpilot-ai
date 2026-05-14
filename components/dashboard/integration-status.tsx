import Link from "next/link";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "ok" | "warn" | "error";

interface IntegrationItem {
  label: string;
  status: Status;
  detail: string;
  action?: { label: string; href: string };
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "ok") return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (status === "warn") return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
}

export function IntegrationStatus({
  calendarConnected,
  whatsappConfigured,
  billingActive,
  plan,
}: {
  calendarConnected: boolean;
  whatsappConfigured: boolean;
  billingActive: boolean;
  plan: string;
}) {
  const items: IntegrationItem[] = [
    {
      label: "WhatsApp",
      status: whatsappConfigured ? "ok" : "error",
      detail: whatsappConfigured
        ? "Número configurado y activo."
        : "Sin número configurado — la IA no puede recibir mensajes.",
      action: whatsappConfigured
        ? undefined
        : { label: "Configurar ahora", href: "/dashboard/settings#whatsapp" },
    },
    {
      label: "Google Calendar",
      status: calendarConnected ? "ok" : "warn",
      detail: calendarConnected
        ? "Calendario conectado — las citas se crean automáticamente."
        : "Sin conectar — la IA no podrá proponer huecos reales de agenda.",
      action: calendarConnected
        ? undefined
        : { label: "Conectar Calendar", href: "/api/google/connect" },
    },
    {
      label: "Plan activo",
      status: billingActive ? "ok" : "error",
      detail: billingActive
        ? `Plan ${plan} activo.`
        : "Suscripción cancelada — las respuestas IA están pausadas.",
      action: billingActive
        ? undefined
        : { label: "Gestionar plan", href: "/dashboard/billing" },
    },
  ];

  const hasIssues = items.some((i) => i.status !== "ok");

  if (!hasIssues) return null;

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Acciones pendientes para que todo funcione
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items
          .filter((i) => i.status !== "ok")
          .map((item) => (
            <div key={item.label} className="flex items-start gap-2 text-sm">
              <StatusIcon status={item.status} />
              <div className="flex-1">
                <span className="font-medium">{item.label}: </span>
                <span className="text-muted-foreground">{item.detail}</span>
                {item.action && (
                  <Link
                    href={item.action.href}
                    className="ml-2 text-primary underline hover:no-underline text-xs"
                  >
                    {item.action.label} →
                  </Link>
                )}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
