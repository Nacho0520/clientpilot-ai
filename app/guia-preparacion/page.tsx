import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Guía de configuración — ClientPilot AI",
  description:
    "Todo lo que necesitas tener listo para configurar tu recepcionista IA en WhatsApp en menos de 15 minutos.",
};

const STEPS = [
  {
    n: 1,
    title: "Cuenta y confirmación de email",
    icon: "📧",
    items: [
      "Usa un email al que tengas acceso en ese momento: recibirás un enlace de confirmación de Supabase.",
      "Revisa la carpeta de spam si no aparece en los primeros 2 minutos.",
      "Haz clic en el enlace para activar tu cuenta. A continuación serás dirigido al asistente de configuración.",
      "La contraseña debe tener al menos 8 caracteres.",
    ],
  },
  {
    n: 2,
    title: "Datos de tu negocio",
    icon: "🏢",
    items: [
      "Nombre comercial tal como lo conocen tus clientes (aparecerá en las respuestas de la IA).",
      "Teléfono de contacto (no es el número de WhatsApp, es solo informativo).",
      "Dirección completa: calle, ciudad y código postal.",
      'Sector: "Clínica estética", "Clínica dental" u "Otro".',
      "Enlace de Google Maps (opcional) — la IA lo usará si un cliente pregunta cómo llegar.",
    ],
  },
  {
    n: 3,
    title: "Lista de servicios",
    icon: "✂️",
    important:
      "La IA usa exactamente estos datos para responder sobre precios y disponibilidad. Añade al menos un servicio antes de continuar.",
    items: [
      "Nombre del servicio (p. ej. «Limpieza facial profunda», «Blanqueamiento dental»).",
      "Precio en euros (número entero o decimal, sin €).",
      "Duración en minutos: la IA la necesita para proponer huecos en el calendario.",
    ],
    tip: "Puedes añadir, editar o eliminar servicios en cualquier momento desde Ajustes → Servicios.",
  },
  {
    n: 4,
    title: "Horario de atención",
    icon: "🕐",
    items: [
      "Configura la apertura y cierre para cada día de la semana.",
      'Marca "Cerrado" en los días que no abres (por defecto, domingo aparece cerrado).',
      "La IA usará este horario para informar sobre disponibilidad y para no proponer citas fuera de él.",
    ],
    tip: "Si tus horarios cambian temporalmente, puedes actualizarlos en Ajustes → Horario.",
  },
  {
    n: 5,
    title: "Recepcionista IA",
    icon: "🤖",
    items: [
      'Nombre de la IA: el nombre con el que se presentará a tus clientes (por defecto «Sofía»).',
      'Tono: "Cercano y amigable", "Formal y profesional" o "Premium y exclusivo".',
      "Instrucciones extra (opcional): restricciones legales o de clínica («Nunca prometas resultados médicos», «No dar precios de tratamientos de más de 1.000 €», etc.).",
    ],
    tip: "Una vez en el panel, podrás añadir también el enlace de tus reseñas de Google y un email para recibir notificaciones cuando llega un lead nuevo.",
  },
  {
    n: 6,
    title: "Conectar WhatsApp",
    icon: "💬",
    isWhatsApp: true,
  },
  {
    n: 7,
    title: "Google Calendar (opcional pero recomendado)",
    icon: "📅",
    items: [
      "Ten a mano la cuenta de Google que usas para gestionar la agenda de tu clínica.",
      'Haz clic en "Conectar Google Calendar" y autoriza el acceso.',
      "Una vez conectado, la IA propondrá huecos reales basados en tu disponibilidad y confirmará citas automáticamente.",
      "Si no lo conectas ahora, podrás hacerlo en cualquier momento desde Ajustes.",
    ],
    tip: "Sin Google Calendar, la IA sigue respondiendo preguntas y recogiendo datos de clientes, pero no podrá proponer horas concretas de forma automática.",
  },
  {
    n: 8,
    title: "Activar tu plan",
    icon: "💳",
    items: [
      'Desde el panel, ve a "Plan y facturación" y elige el plan que mejor se adapta a tu volumen.',
      "Los primeros 14 días son completamente gratuitos. Sin compromiso de permanencia.",
      "La activación del plan es inmediata: el límite de respuestas se actualiza al momento.",
      "Puedes cambiar de plan o cancelar en cualquier momento desde el portal de facturación.",
    ],
    tip: "Plan Starter: 500 respuestas IA/mes. Plan Pro: 2.000. Plan Clinic: ilimitadas. Los contadores se reinician cada mes.",
  },
];

export default function GuiaPreparacionPage() {
  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
              CP
            </div>
            <span className="font-semibold">ClientPilot AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm">Empezar gratis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b bg-secondary/20 py-12">
        <div className="container max-w-3xl text-center">
          <Badge className="mb-4">Guía de configuración</Badge>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Todo listo para empezar en 15 minutos
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Esta guía te dice exactamente qué información necesitas tener a mano antes de completar el
            asistente de alta. Síguelos en orden y tu recepcionista IA estará activa hoy mismo.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            {["8 pasos", "~15 min", "Sin tarjeta al principio"].map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-emerald-500" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="container max-w-3xl py-12 space-y-8">
        {STEPS.map((step) => (
          <div key={step.n} className="flex gap-5">
            {/* Step number */}
            <div className="flex flex-col items-center">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                {step.n}
              </div>
              {step.n < STEPS.length && (
                <div className="mt-2 w-0.5 flex-1 bg-border" />
              )}
            </div>

            {/* Content */}
            <div className="pb-8 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{step.icon}</span>
                <h2 className="text-lg font-semibold">{step.title}</h2>
              </div>

              {step.isWhatsApp ? (
                <WhatsAppSection />
              ) : (
                <>
                  {step.important && (
                    <div className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{step.important}</span>
                    </div>
                  )}
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {step.items?.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {step.tip && (
                    <div className="mt-3 flex gap-2 rounded-lg border bg-secondary/50 p-3 text-sm text-muted-foreground">
                      <Info className="size-4 shrink-0 mt-0.5" />
                      <span>{step.tip}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* FAQ rápido */}
      <section className="border-t bg-secondary/20 py-12">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-semibold mb-6 text-center">Dudas frecuentes sobre la configuración</h2>
          <div className="space-y-3">
            {[
              {
                q: "¿Puedo cambiar cualquier dato después del alta?",
                a: "Sí. Todos los ajustes (nombre, servicios, horarios, recepcionista IA, WhatsApp, Google Calendar) se pueden modificar en cualquier momento desde el panel → Ajustes.",
              },
              {
                q: "¿El plan Starter es de pago desde el primer día?",
                a: "No. Los primeros 14 días son completamente gratuitos. A partir del día 15, se activa la facturación del plan que hayas elegido.",
              },
              {
                q: "¿Puedo conectar Google Calendar más tarde?",
                a: "Sí. Puedes saltarte ese paso en el asistente inicial y conectarlo en cualquier momento desde Ajustes → Google Calendar.",
              },
              {
                q: "¿Necesito una cuenta especial de WhatsApp Business?",
                a: "Depende del proveedor que elijas. Con Twilio usas el número que ya tienes en nuestra cuenta. Con Meta Cloud API necesitas un número de WhatsApp Business y sus IDs correspondientes.",
              },
              {
                q: "¿La IA puede responder en varios idiomas?",
                a: "Sí. Si tu cliente escribe en inglés, francés o catalán (por ejemplo), la IA lo detecta y responde en ese idioma usando la información de tu negocio.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-lg border bg-background p-4"
              >
                <summary className="cursor-pointer font-medium list-none flex items-center justify-between text-sm">
                  {faq.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-12 text-center">
        <h2 className="text-2xl font-semibold mb-3">¿Todo listo?</h2>
        <p className="text-muted-foreground mb-6">
          Empieza el asistente de alta ahora. En 15 minutos tu recepcionista IA estará activa.
        </p>
        <Link href="/login">
          <Button size="lg">Crear mi cuenta gratis</Button>
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">14 días gratis · Sin tarjeta · Cancela cuando quieras</p>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-semibold">CP</div>
            <span>© 2026 ClientPilot AI</span>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-foreground">Inicio</Link>
            <Link href="/privacy" className="hover:text-foreground">Política de privacidad</Link>
            <Link href="/terms" className="hover:text-foreground">Términos de servicio</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function WhatsAppSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Elige el proveedor que mejor se adapte a ti. Ambas opciones permiten que la IA reciba y
        responda mensajes de WhatsApp de tus clientes.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>Twilio</span>
              <Badge variant="secondary" className="text-xs">Más sencillo</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Recomendado para empezar</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>Lo que necesitas tener a mano:</p>
            <ul className="space-y-1.5">
              {[
                "El número de WhatsApp que ClientPilot asignará a tu clínica (formato +34XXXXXXXXX).",
                "Acceso al panel de Twilio para configurar la URL del webhook (te la mostramos en el asistente).",
              ].map((item) => (
                <li key={item} className="flex gap-1.5">
                  <CheckCircle className="size-3.5 shrink-0 mt-0.5 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-2 rounded bg-secondary/60 p-2 text-xs">
              El número es gestionado directamente por el equipo de ClientPilot dentro de nuestra cuenta Twilio.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>Meta Cloud API</span>
              <Badge variant="secondary" className="text-xs">Para tu propio WABA</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Si ya tienes WhatsApp Business oficial</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>Lo que necesitas tener a mano:</p>
            <ul className="space-y-1.5">
              {[
                "Phone Number ID de Meta (lo encuentras en Meta Business Suite → WhatsApp → Números de teléfono).",
                "WABA ID (ID de la cuenta de WhatsApp Business, en la misma sección).",
                "Acceso para configurar el webhook en Meta → WhatsApp → Configuración (URL que te mostramos).",
              ].map((item) => (
                <li key={item} className="flex gap-1.5">
                  <CheckCircle className="size-3.5 shrink-0 mt-0.5 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-2 rounded bg-secondary/60 p-2 text-xs">
              Esta opción requiere coordinación con el equipo de ClientPilot para validar los permisos de acceso a tu cuenta Meta.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-300">
        <Info className="size-4 shrink-0 mt-0.5" />
        <span>
          Si tienes dudas sobre cuál elegir, empieza con Twilio. Siempre puedes cambiar después desde
          Ajustes → WhatsApp.
        </span>
      </div>
    </div>
  );
}
