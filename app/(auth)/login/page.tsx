"use client";
import { useReducer, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MessageSquare, CalendarCheck, TrendingUp, Zap } from "lucide-react";

const PLAN_DETAILS: Record<string, { name: string; price: string; color: string; features: string[]; highlight: string }> = {
  starter: {
    name: "Starter", price: "79€/mes", color: "indigo",
    highlight: "Perfecto para clínicas individuales",
    features: ["500 respuestas IA/mes", "Agendado automático", "1 número WhatsApp", "Panel de control completo"],
  },
  pro: {
    name: "Pro", price: "179€/mes", color: "primary",
    highlight: "El más popular entre clínicas en crecimiento",
    features: ["2.000 respuestas IA/mes", "Follow-ups automáticos", "Informes semanales", "Soporte prioritario"],
  },
  clinic: {
    name: "Clinic", price: "349€/mes + setup", color: "emerald",
    highlight: "Para grupos de clínicas y centros grandes",
    features: ["Respuestas IA ilimitadas", "Múltiples centros", "Onboarding personalizado", "Account manager"],
  },
};

const BENEFITS = [
  { icon: MessageSquare, text: "Responde WhatsApp 24/7 automáticamente" },
  { icon: CalendarCheck, text: "Agenda citas con Google Calendar" },
  { icon: TrendingUp, text: "Recupera leads con follow-ups" },
  { icon: Zap, text: "Lista en menos de 15 minutos" },
];

type LoginState = { mode: "signin" | "signup"; email: string; password: string; err: string | null; busy: boolean; signupDone: boolean };
type LoginAction = { type: "SET"; patch: Partial<LoginState> };
function loginReducer(s: LoginState, a: LoginAction): LoginState { return { ...s, ...a.patch }; }

function LoginContent() {
  const { push, refresh } = useRouter();
  const { get: getParam } = useSearchParams();
  const planParam = getParam("plan") ?? "";
  const plan = PLAN_DETAILS[planParam];

  const [state, dispatch] = useReducer(loginReducer, {
    mode: plan ? "signup" : "signin",
    email: "", password: "", err: null, busy: false, signupDone: false,
  });
  const { mode, email, password, err, busy, signupDone } = state;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "SET", patch: { busy: true, err: null } });
    const supa = createClient();

    if (mode === "signup") {
      const { error } = await supa.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      dispatch({ type: "SET", patch: { busy: false } });
      if (error) return dispatch({ type: "SET", patch: { err: error.message } });
      dispatch({ type: "SET", patch: { signupDone: true } });
      return;
    }

    const { error } = await supa.auth.signInWithPassword({ email, password });
    dispatch({ type: "SET", patch: { busy: false } });
    if (error) return dispatch({ type: "SET", patch: { err: error.message } });
    push("/dashboard");
    refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — context / benefits */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/20 text-sm font-semibold">CP</div>
            <span className="text-xl font-semibold">ClientPilot AI</span>
          </div>

          {plan ? (
            <div>
              <Badge className="mb-4 bg-white/20 text-white border-white/30">Plan seleccionado</Badge>
              <h1 className="text-4xl font-semibold mb-2">{plan.name}</h1>
              <p className="text-3xl font-light mb-2 opacity-90">{plan.price}</p>
              <p className="text-primary-foreground/70 mb-8">{plan.highlight}</p>
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle className="size-5 text-white/80 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 rounded-xl bg-white/10 p-4 text-sm">
                14 días gratis, sin tarjeta de crédito. Cancela cuando quieras.
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-4xl font-semibold mb-4">Tu recepcionista IA en WhatsApp</h1>
              <p className="text-xl opacity-80 mb-10">Responde, agenda y recupera clientes mientras tú te dedicas a lo importante.</p>
              <ul className="space-y-4">
                {BENEFITS.map((b) => (
                  <li key={b.text} className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-white/15">
                      <b.icon className="size-4" />
                    </div>
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-white/20 pt-8">
          <div className="flex items-center gap-4">
            {[{ val: "1.200+", label: "clientes atendidos" }, { val: "98%", label: "satisfacción" }, { val: "< 8s", label: "tiempo de respuesta" }].map((s) => (
              <div key={s.label} className="flex-1 text-center">
                <p className="text-2xl font-semibold">{s.val}</p>
                <p className="text-xs opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-semibold">CP</div>
            <span className="font-semibold">ClientPilot AI</span>
          </div>

          {signupDone ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-2xl font-semibold mb-2">Revisa tu email</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Te hemos enviado un enlace de confirmación a <strong>{email}</strong>. Haz clic en él para activar tu cuenta y empezar.
              </p>
              <p className="text-xs text-muted-foreground">¿No lo ves? Revisa la carpeta de spam.</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-1">
                {mode === "signin" ? "Bienvenido de vuelta" : plan ? `Empieza con el plan ${plan.name}` : "Crea tu cuenta"}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {mode === "signin"
                  ? "Accede a tu panel de ClientPilot AI."
                  : "14 días gratis. Sin tarjeta de crédito."}
              </p>

              {plan && mode === "signup" && (
                <div className="mb-5 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm flex items-center gap-2">
                  <CheckCircle className="size-4 text-primary shrink-0" />
                  <span>Incluye plan <strong>{plan.name}</strong> ({plan.price}) con 14 días gratis</span>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="tu@clinica.com"
                    value={email}
                    onChange={(e) => dispatch({ type: "SET", patch: { email: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    {mode === "signin" && (
                      <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder={mode === "signup" ? "Mínimo 8 caracteres" : "••••••••"}
                    value={password}
                    onChange={(e) => dispatch({ type: "SET", patch: { password: e.target.value } })}
                  />
                  {mode === "signup" && password.length > 0 && password.length < 8 && (
                    <p className="text-xs text-amber-600">La contraseña debe tener al menos 8 caracteres</p>
                  )}
                </div>

                {err && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {err === "Invalid login credentials"
                      ? "Email o contraseña incorrectos."
                      : err === "User already registered"
                      ? "Este email ya tiene cuenta. Inicia sesión."
                      : err}
                  </div>
                )}

                <Button type="submit" disabled={busy} className="w-full" size="lg">
                  {busy ? "Procesando..." : mode === "signin" ? "Entrar al panel" : "Crear cuenta gratis"}
                </Button>
              </form>

              {mode === "signup" && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Al crear tu cuenta aceptas nuestros{" "}
                  <Link href="/terms" className="underline hover:text-foreground">Términos de servicio</Link>
                  {" "}y{" "}
                  <Link href="/privacy" className="underline hover:text-foreground">Política de privacidad</Link>.
                </p>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET", patch: { mode: mode === "signin" ? "signup" : "signin", err: null } })}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {mode === "signin"
                    ? "¿No tienes cuenta? Empieza gratis"
                    : "¿Ya tienes cuenta? Inicia sesión"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
