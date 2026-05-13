"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveOnboardingStep, completeOnboarding, saveOnboardingWhatsApp } from "./actions";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const STEPS = [
  { label: "Negocio", icon: "🏢" },
  { label: "Servicios", icon: "✂️" },
  { label: "Horarios", icon: "🕐" },
  { label: "Recepcionista IA", icon: "🤖" },
  { label: "WhatsApp", icon: "💬" },
  { label: "Google Calendar", icon: "📅" },
  { label: "¡Listo!", icon: "🎉" },
];

type Service = { name: string; price: string; duration: string };
type Hour = { day: number; open: string; close: string; closed: boolean };
type InitialBusiness = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  google_maps_url?: string | null;
  sector?: string | null;
  services?: Array<{ name: string; price_cents: number; duration_minutes: number }>;
  business_hours?: Array<{ day_of_week: number; open_time: string | null; close_time: string | null; closed: boolean | null }>;
  business_settings?: Array<{ ai_name: string | null; tone: string | null; custom_instructions: string | null }>;
};

export default function OnboardingWizard({ initialBusiness }: { initialBusiness: InitialBusiness | null }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [step, setStep] = useState(initialBusiness ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialBusiness?.name ?? "");
  const [phone, setPhone] = useState(initialBusiness?.phone ?? "");
  const [address, setAddress] = useState(initialBusiness?.address ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialBusiness?.google_maps_url ?? "");
  const [sector, setSector] = useState(initialBusiness?.sector ?? "aesthetic_clinic");

  const [services, setServices] = useState<Service[]>(
    initialBusiness?.services?.map((s) => ({
      name: s.name,
      price: (s.price_cents / 100).toString(),
      duration: s.duration_minutes.toString(),
    })) ?? [{ name: "", price: "", duration: "30" }]
  );

  const [hours, setHours] = useState<Hour[]>(
    DAYS.map((_, i) => {
      const h = initialBusiness?.business_hours?.find((x) => x.day_of_week === i);
      return { day: i, open: h?.open_time?.slice(0, 5) ?? "09:00", close: h?.close_time?.slice(0, 5) ?? "19:00", closed: h?.closed ?? (i === 0) };
    })
  );

  const [aiName, setAiName] = useState(initialBusiness?.business_settings?.[0]?.ai_name ?? "Sofía");
  const [tone, setTone] = useState(initialBusiness?.business_settings?.[0]?.tone ?? "friendly");
  const [customInstr, setCustomInstr] = useState(initialBusiness?.business_settings?.[0]?.custom_instructions ?? "");

  const [waProvider, setWaProvider] = useState<"twilio" | "meta">("twilio");
  const [twilioNumber, setTwilioNumber] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");

  async function next() {
    setSaving(true);
    setError(null);
    start(async () => {
      try {
        if (step === 4) {
          const res = await saveOnboardingWhatsApp({
            provider: waProvider,
            twilioNumber: waProvider === "twilio" ? twilioNumber : undefined,
            metaPhoneNumberId: waProvider === "meta" ? metaPhoneNumberId : undefined,
            metaWabaId: waProvider === "meta" ? metaWabaId : undefined,
          });
          if (res.error) { setError(res.error); setSaving(false); return; }
        } else {
          await saveOnboardingStep({ step, name, phone, address, sector, googleMapsUrl, services, hours, aiName, tone, customInstr });
        }
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el onboarding.");
      } finally {
        setSaving(false);
      }
    });
  }

  async function finish() {
    setError(null);
    start(async () => {
      try {
        await completeOnboarding();
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo completar el onboarding.");
      }
    });
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <main className="container max-w-2xl py-12">
      {/* Progress header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{STEPS[step].icon}</span>
            <div>
              <p className="font-semibold">{STEPS[step].label}</p>
              <p className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</p>
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {/* Step dots */}
        <div className="mt-3 flex justify-between">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex flex-col items-center gap-1`}>
              <div className={`h-2 w-2 rounded-full transition-colors ${i < step ? "bg-primary" : i === step ? "bg-primary ring-2 ring-primary/30" : "bg-secondary"}`} />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Datos de tu negocio</CardTitle>
            <CardDescription>En 15 minutos tu recepcionista IA estará atendiendo WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Nombre del negocio *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Clínica Bella" /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 600 000 000" /></div>
            </div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle Mayor 1, Madrid" /></div>
            <div className="space-y-2"><Label>Enlace Google Maps (opcional)</Label><Input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." /></div>
            <div className="space-y-2">
              <Label>Sector</Label>
              <select className="w-full rounded-md border bg-background p-2 text-sm" value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="aesthetic_clinic">Clínica estética</option>
                <option value="dental">Clínica dental</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <Button onClick={next} disabled={!name || saving}>{saving ? "Guardando..." : "Continuar →"}</Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Tus servicios</CardTitle><CardDescription>Añade al menos uno. La IA usará estos precios y duraciones para responder.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-6">Servicio</span><span className="col-span-2 text-right">€</span><span className="col-span-2 text-right">Min</span>
            </div>
            {services.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-6" placeholder="Limpieza facial" value={s.name} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <Input className="col-span-2" type="number" placeholder="65" value={s.price} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} />
                <Input className="col-span-2" type="number" placeholder="45" value={s.duration} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))} />
                <Button variant="ghost" size="icon" className="col-span-2 text-muted-foreground" onClick={() => setServices(services.filter((_, j) => j !== i))}>×</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setServices([...services, { name: "", price: "", duration: "30" }])}>+ Añadir servicio</Button>
            <div className="pt-2">
              <Button onClick={next} disabled={!services.some((s) => s.name && s.price) || saving}>{saving ? "Guardando..." : "Continuar →"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Horario de atención</CardTitle><CardDescription>La IA usará este horario para responder preguntas sobre disponibilidad.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {hours.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 text-sm shrink-0">{DAYS[i]}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={!h.closed} onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, closed: !e.target.checked } : x))} />
                  Abierto
                </label>
                <Input type="time" className="w-28" disabled={h.closed} value={h.open} onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, open: e.target.value } : x))} />
                <span className="text-muted-foreground text-sm">–</span>
                <Input type="time" className="w-28" disabled={h.closed} value={h.close} onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, close: e.target.value } : x))} />
              </div>
            ))}
            <div className="pt-2"><Button onClick={next} disabled={saving}>{saving ? "Guardando..." : "Continuar →"}</Button></div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Tu recepcionista IA</CardTitle><CardDescription>Personaliza cómo se presenta a tus clientes.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Nombre de la recepcionista</Label><Input value={aiName} onChange={(e) => setAiName(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Tono</Label>
                <select className="w-full rounded-md border bg-background p-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="friendly">Cercano y amigable</option>
                  <option value="formal">Formal y profesional</option>
                  <option value="premium">Premium y exclusivo</option>
                </select>
              </div>
            </div>
            <div className="space-y-2"><Label>Instrucciones extra (opcional)</Label><Textarea value={customInstr} onChange={(e) => setCustomInstr(e.target.value)} placeholder="Ej.: Nunca prometas resultados médicos." /></div>
            <div className="rounded-lg border bg-secondary/50 p-4 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Vista previa</p>
              <p className="italic">&quot;¡Hola! Soy <strong>{aiName}</strong> de {name || "tu clínica"}. ¿En qué puedo ayudarte?&quot;</p>
            </div>
            <Button onClick={next} disabled={saving}>{saving ? "Guardando..." : "Continuar →"}</Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Conecta WhatsApp</CardTitle><CardDescription>Tu IA recibirá y responderá mensajes de WhatsApp Business.</CardDescription></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={waProvider}
                onChange={(e) => setWaProvider(e.target.value as "twilio" | "meta")}
              >
                <option value="twilio">Twilio (Sandbox o número propio)</option>
                <option value="meta">Meta Cloud API (WhatsApp Business)</option>
              </select>
            </div>

            {waProvider === "twilio" && (
              <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
                <p className="font-medium">Configuración Twilio</p>
                <div className="space-y-1">
                  <Label htmlFor="twilio_number_step4">Tu número WhatsApp Twilio</Label>
                  <Input
                    id="twilio_number_step4"
                    placeholder="+34600000000"
                    value={twilioNumber}
                    onChange={(e) => setTwilioNumber(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Configura este webhook en Twilio → Messaging → WhatsApp → Senders:</p>
                <code className="block rounded bg-background border p-2 text-xs break-all">
                  {process.env.NEXT_PUBLIC_APP_URL ?? "https://tudominio.com"}/api/twilio/webhook
                </code>
              </div>
            )}

            {waProvider === "meta" && (
              <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
                <p className="font-medium">Configuración Meta Cloud API</p>
                <div className="space-y-1">
                  <Label htmlFor="meta_phone_id_step4">Phone Number ID</Label>
                  <Input
                    id="meta_phone_id_step4"
                    placeholder="123456789012345"
                    value={metaPhoneNumberId}
                    onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meta_waba_id_step4">WABA ID</Label>
                  <Input
                    id="meta_waba_id_step4"
                    placeholder="987654321098765"
                    value={metaWabaId}
                    onChange={(e) => setMetaWabaId(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Configura este webhook en Meta → WhatsApp → Configuration:</p>
                <code className="block rounded bg-background border p-2 text-xs break-all">
                  {process.env.NEXT_PUBLIC_APP_URL ?? "https://tudominio.com"}/api/meta/webhook
                </code>
              </div>
            )}

            <Button onClick={next} disabled={saving}>{saving ? "Guardando..." : "Continuar →"}</Button>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader><CardTitle>Conecta Google Calendar</CardTitle><CardDescription>Para que tu IA proponga huecos reales y confirme citas automáticamente.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <a href="/api/google/connect"><Button>Conectar Google Calendar</Button></a>
            <p className="text-sm text-muted-foreground">Puedes saltarte este paso y conectarlo más tarde desde Ajustes.</p>
            <Button variant="outline" onClick={next}>Saltar por ahora →</Button>
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card className="border-primary">
          <CardHeader>
            <div className="text-4xl mb-2">🎉</div>
            <CardTitle>¡Tu recepcionista IA está lista!</CardTitle>
            <CardDescription>Ya está respondiendo por WhatsApp. Ve al panel para ver leads, citas y métricas en tiempo real.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={finish} className="w-full">Ir al panel →</Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
