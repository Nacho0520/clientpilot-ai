"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    window.location.href = url;
  }

  async function portal() {
    const r = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await r.json();
    window.location.href = url;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Plan y facturación</h1>
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
              <Button disabled={busy === p.id} onClick={() => subscribe(p.id)} className="w-full">
                {busy === p.id ? "Procesando..." : "Empezar prueba (14 días)"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="outline" onClick={portal}>Gestionar suscripción</Button>
    </div>
  );
}
