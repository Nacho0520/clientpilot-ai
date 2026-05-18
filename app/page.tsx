import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DemoChat from "@/components/landing/demo-chat";
import { MessageSquare, CalendarCheck, TrendingUp, BarChart3, CheckCircle, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "ClientPilot AI — Recepcionista IA para clínicas en WhatsApp",
  description: "Responde, agenda citas y recupera leads en WhatsApp automáticamente. Diseñado para clínicas estéticas y dentales. Empieza gratis 14 días.",
};

const CHART_BARS = [3, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 8, 9, 14].map((h, i) => ({ id: i, h }));

const FEATURES = [
  { icon: MessageSquare, title: "Responde sola", body: "Contesta cada mensaje en segundos, 24/7. Tu cliente nunca espera." },
  { icon: CalendarCheck, title: "Agenda citas", body: "Conectada a tu Google Calendar — propone huecos reales y confirma." },
  { icon: TrendingUp, title: "Recupera leads", body: "Hace follow-up automático a las consultas que no acaban en cita." },
  { icon: BarChart3, title: "Informes claros", body: "Sabes cuántos leads, cuántas citas y cuánto dinero recuperaste." },
];

const TESTIMONIALS = [
  { name: "Dra. Marta L.", role: "Clínica estética, Madrid", quote: "Antes perdía 3 de cada 10 clientes por no responder a tiempo. Ahora ninguno." },
  { name: "Carlos R.", role: "Clínica dental, Valencia", quote: "Mi recepcionista IA me agenda citas hasta los domingos. Ha sido el mejor cambio del año." },
  { name: "Lucía V.", role: "Centro de medicina estética, Barcelona", quote: "Recuperé 4.000€ el primer mes solo con los follow-ups automáticos." },
];

const PLANS = [
  { name: "Starter", price: "79€", features: ["500 respuestas IA/mes", "Agendado automático", "1 número"] },
  { name: "Pro", price: "179€", featured: true, features: ["2.000 respuestas IA/mes", "Follow-ups automáticos", "Informes semanales"] },
  { name: "Clinic", price: "349€ + setup", features: ["Respuestas ilimitadas", "Múltiples centros", "Soporte prioritario"] },
];

const FAQS = [
  { q: "¿Cuánto tarda en estar lista?", a: "Menos de 15 minutos desde el registro. El onboarding te guía paso a paso." },
  { q: "¿Mi WhatsApp Business actual sigue funcionando?", a: "Sí. La IA se conecta encima — tú puedes intervenir cualquier conversación cuando quieras." },
  { q: "¿La IA puede equivocarse?", a: "Solo responde con la información que tú configuras. Si no sabe algo, deriva al equipo humano." },
  { q: "¿Y si quiero cancelar?", a: "Puedes cancelar cuando quieras desde el portal. Sin permanencia." },
  { q: "¿Funciona con clínicas pequeñas?", a: "Sí. El plan Starter está pensado para profesionales independientes y clínicas con un solo número." },
  { q: "¿Es legal? ¿Qué pasa con el RGPD?", a: "Los datos se almacenan en servidores EU y nunca se comparten con terceros. Cumplimos RGPD." },
];

function DashboardMockup() {
  return (
    <div className="rounded-xl border bg-background shadow-2xl overflow-hidden text-xs">
      {/* Topbar */}
      <div className="flex items-center gap-2 border-b bg-secondary/30 px-4 py-2">
        <span className="font-semibold text-sm">ClientPilot AI</span>
        <span className="ml-auto text-muted-foreground">Clínica Bella · Pro</span>
      </div>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-32 border-r bg-secondary/20 p-3 space-y-1.5">
          {["Resumen", "Conversaciones", "Citas", "Ajustes"].map((item, i) => (
            <div key={item} className={`rounded px-2 py-1 ${i === 0 ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground"}`}>{item}</div>
          ))}
          <div className="mt-4 rounded bg-primary/10 text-primary px-2 py-1.5">
            <p className="font-medium">PRO</p>
            <p className="text-[10px] opacity-70">342 / 2000 resp.</p>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 p-3 space-y-2">
          <p className="font-semibold">Resumen: últimos 30 días</p>
          <div className="grid grid-cols-5 gap-1.5">
            {[["Leads", "47"], ["Citas", "31"], ["Resp. media", "8s"], ["Follow-ups", "12"], ["Ingresos est.", "4.340€"]].map(([label, val]) => (
              <div key={label} className="rounded border bg-background p-1.5">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="font-semibold">{val}</p>
              </div>
            ))}
          </div>
          {/* Mini chart */}
          <div className="rounded border bg-background p-2">
            <p className="text-[10px] text-muted-foreground mb-1">Actividad</p>
            <div className="flex items-end gap-0.5 h-10">
              {CHART_BARS.map(({ id, h }) => (
                <div key={id} className="flex-1 bg-primary/70 rounded-t" style={{ height: `${(h / 14) * 100}%` }} />
              ))}
            </div>
          </div>
          {/* Conversations */}
          <div className="rounded border bg-background divide-y">
            {[["Ana G.", "+34 612...", "lead"], ["Carlos M.", "+34 678...", "converted"]].map(([name, phone, status]) => (
              <div key={name} className="flex items-center justify-between px-2 py-1.5">
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-[10px] text-muted-foreground">{phone}</p>
                </div>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${status === "lead" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-semibold">CP</div>
            <span className="font-semibold">ClientPilot AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="#demo" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Demo</Link>
            <Link href="#pricing" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Precios</Link>
            <Link href="/guia-preparacion" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Guía</Link>
            <ThemeToggle />
            <Link href="/login"><Button size="sm">Entrar</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <Badge className="mb-4">Recepcionista IA para clínicas</Badge>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl leading-tight">
              Tu clínica nunca pierde un cliente por no responder WhatsApp
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              ClientPilot AI responde, agenda citas y recupera leads en tu WhatsApp automáticamente. Diseñada para clínicas estéticas y dentales.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login"><Button size="lg">Empieza gratis 14 días</Button></Link>
              <Link href="#demo"><Button size="lg" variant="outline">Ver demo en vivo</Button></Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {["Sin tarjeta de crédito", "14 días gratis", "Listo en 15 min"].map((f) => (
                <span key={f} className="flex items-center gap-1"><CheckCircle className="size-4 text-emerald-500" />{f}</span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 blur-xl" />
            <div className="relative">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y bg-secondary/20 py-16">
        <div className="container">
          <h2 className="mb-3 text-center text-3xl font-semibold">Todo lo que necesita tu clínica</h2>
          <p className="mb-10 text-center text-muted-foreground">Una IA que trabaja mientras tú atiendes pacientes</p>
          <div className="grid gap-6 md:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-0 bg-background shadow-sm">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="container py-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <Badge className="mb-3"><Zap className="mr-1 size-3" />Demo en vivo</Badge>
            <h2 className="text-3xl font-semibold">Pruébala ahora</h2>
            <p className="mt-2 text-muted-foreground">Habla con la IA como si fueras un paciente. Es la misma tecnología que usarán tus clientes.</p>
          </div>
          <DemoChat />
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y bg-secondary/20 py-16">
        <div className="container">
          <h2 className="mb-1 text-center text-3xl font-semibold">Clínicas que ya recuperan clientes</h2>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-10">Ejemplos ilustrativos</p>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="mb-4 text-primary text-2xl">&quot;</div>
                  <p className="text-sm leading-relaxed">{t.quote}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container py-16">
        <h2 className="mb-3 text-center text-3xl font-semibold">Precios sencillos</h2>
        <p className="mb-10 text-center text-muted-foreground">Sin permanencia. Cancela cuando quieras.</p>
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {PLANS.map((p) => (
            <Card key={p.name} className={p.featured ? "border-primary ring-2 ring-primary shadow-lg relative" : ""}>
              {p.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge>Más popular</Badge></div>}
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <div>
                  <span className="text-3xl font-semibold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={`/login?plan=${p.name.toLowerCase()}`}>
                  <Button className="w-full" variant={p.featured ? "default" : "outline"}>
                    Empezar gratis 14 días
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-secondary/20 py-16">
        <div className="container">
          <h2 className="mb-10 text-center text-3xl font-semibold">Preguntas frecuentes</h2>
          <div className="mx-auto max-w-2xl space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-lg border bg-background p-4">
                <summary className="cursor-pointer font-semibold list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="container py-16 text-center">
        <h2 className="text-3xl font-semibold mb-4">¿Lista para no perder más clientes?</h2>
        <p className="text-muted-foreground mb-8">14 días gratis, sin tarjeta de crédito. Lista en 15 minutos.</p>
        <Link href="/login"><Button size="lg">Empezar ahora</Button></Link>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-semibold">CP</div>
            <span>© 2026 ClientPilot AI</span>
          </div>
          <div className="flex gap-4">
            <Link href="/guia-preparacion" className="hover:text-foreground">Guía de configuración</Link>
            <Link href="/privacy" className="hover:text-foreground">Política de privacidad</Link>
            <Link href="/terms" className="hover:text-foreground">Términos de servicio</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
