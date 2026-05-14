"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BILLING_DISABLED = process.env.NEXT_PUBLIC_BILLING_DISABLED === "true";

const PLANS = [
  { id: "starter", name: "Starter", price: "79€/mes", features: ["Hasta 500 respuestas IA/mes", "Agendado automático", "1 número WhatsApp"] },
  { id: "pro", name: "Pro", price: "179€/mes", features: ["Hasta 2.000 respuestas IA/mes", "Follow-ups automáticos", "Informes semanales"] },
  { id: "clinic", name: "Clinic", price: "349€/mes + setup", features: ["Respuestas IA ilimitadas", "Múltiples centros", "Soporte prioritario"] },
];

export default function BillingPage() {
  const [busy, setBusy] = useState<string | null>(null);

  async function subscribe(plan: string) {
    setBusy(plan);
    const r = await fetch("/api/stripe/checkout", { method: "POST", body: JSON.stringify({ plan }) });
    const { url } = await r.json();
    if (url) window.location.href = url;
    else setBusy(null);
  }

  async function portal() {
    const r = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await r.json();
    if (url) window.location.href = url;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Plan y facturación</h1>

      {BILLING_DISABLED && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Los pagos online estarán disponibles próximamente. Mientras tanto tu cuenta tiene acceso completo sin coste.
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <CardDescription>{p.price}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-1 text-sm">
                {p.features.map((f) => <li key={f}>· {f}</li>)}
              </ul>
              <Button
                disabled={BILLING_DISABLED || busy === p.id}
                onClick={() => subscribe(p.id)}
                className="w-full"
                title={BILLING_DISABLED ? "Facturación próximamente" : undefined}
              >
                {busy === p.id ? "Procesando..." : "Empezar prueba (14 días)"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!BILLING_DISABLED && (
        <Button variant="outline" onClick={portal}>Gestionar suscripción</Button>
      )}
    </div>
  );
}
