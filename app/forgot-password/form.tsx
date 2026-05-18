"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const supa = createClient();
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">CP</div>
            <span className="font-bold">ClientPilot AI</span>
          </div>
          <CardTitle>Recuperar contraseña</CardTitle>
          <CardDescription>
            Te enviamos un enlace para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📧</div>
              <p className="font-medium mb-1">Email enviado</p>
              <p className="text-sm text-muted-foreground mb-4">
                Revisa tu bandeja de entrada en <strong>{email}</strong> y haz clic en el enlace.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">Volver al inicio de sesión</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Tu email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="tu@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Enviando..." : "Enviar enlace"}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full">← Volver</Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
