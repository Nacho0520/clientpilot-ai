import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { saveBusinessInfo, saveAISettings, saveService, deleteService, saveHours, saveWhatsAppNumberForm, saveMetaProviderForm } from "./actions";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Service = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
};

type BusinessHour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  closed: boolean | null;
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const [{ google }, { user, supa }] = await Promise.all([searchParams, auth()]);
  const { data: biz } = await supa
    .from("businesses")
    .select("*, business_settings(*), services(*), business_hours(*)")
    .eq("owner_id", user.id)
    .single();
  const calendarConnected = !!biz?.google_oauth_tokens_encrypted;
  const settings = biz?.business_settings?.[0];
  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      {google === "connected" && (
        <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          Google Calendar conectado correctamente.
        </p>
      )}

      {/* Business info */}
      <Card>
        <CardHeader><CardTitle>Datos del negocio</CardTitle></CardHeader>
        <CardContent>
          <form action={saveBusinessInfo} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" defaultValue={biz?.name ?? ""} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" defaultValue={biz?.phone ?? ""} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" name="address" defaultValue={biz?.address ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="google_maps_url">Enlace Google Maps (opcional)</Label>
              <Input id="google_maps_url" name="google_maps_url" placeholder="https://maps.google.com/..." defaultValue={biz?.google_maps_url ?? ""} />
            </div>
            <Button type="submit">Guardar datos</Button>
          </form>
        </CardContent>
      </Card>

      {/* AI receptionist */}
      <Card>
        <CardHeader><CardTitle>Recepcionista IA</CardTitle><CardDescription>Así se presenta a tus clientes por WhatsApp.</CardDescription></CardHeader>
        <CardContent>
          <form action={saveAISettings} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ai_name">Nombre de la IA</Label>
                <Input id="ai_name" name="ai_name" defaultValue={settings?.ai_name ?? "Sofía"} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tone">Tono</Label>
                <select id="tone" name="tone" defaultValue={settings?.tone ?? "friendly"} className="w-full rounded-md border bg-background p-2 text-sm">
                  <option value="friendly">Cercano y amigable</option>
                  <option value="formal">Formal y profesional</option>
                  <option value="premium">Premium y exclusivo</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="custom_instructions">Instrucciones extra</Label>
              <Textarea id="custom_instructions" name="custom_instructions" defaultValue={settings?.custom_instructions ?? ""} placeholder="Ej.: Nunca prometas resultados médicos." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="review_link_url">Enlace reseñas Google</Label>
                <Input id="review_link_url" name="review_link_url" defaultValue={settings?.review_link_url ?? ""} placeholder="https://g.page/..." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notification_email">Email notificaciones leads</Label>
                <Input id="notification_email" name="notification_email" type="email" defaultValue={settings?.notification_email ?? ""} />
              </div>
            </div>
            <Button type="submit">Guardar recepcionista</Button>
          </form>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader><CardTitle>Servicios</CardTitle><CardDescription>La IA usa estos precios y duraciones para responder.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {(biz?.services as Service[] | undefined)?.map((s) => (
            <form key={s.id} action={saveService} className="grid grid-cols-12 gap-2 items-end">
              <input type="hidden" name="id" value={s.id} />
              <div className="col-span-5 space-y-1">
                <Label>Servicio</Label>
                <Input name="name" defaultValue={s.name} required />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>€</Label>
                <Input name="price" type="number" step="0.01" defaultValue={(s.price_cents / 100).toString()} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Min</Label>
                <Input name="duration" type="number" defaultValue={s.duration_minutes.toString()} />
              </div>
              <div className="col-span-2">
                <Button type="submit" size="sm" variant="outline" className="w-full">Guardar</Button>
              </div>
              <div className="col-span-1">
                <Button type="submit" formAction={deleteService.bind(null, s.id)} size="sm" variant="ghost" className="w-full text-destructive">×</Button>
              </div>
            </form>
          ))}
          <form action={saveService} className="grid grid-cols-12 gap-2 items-end border-t pt-4">
            <div className="col-span-5 space-y-1">
              <Label>Nuevo servicio</Label>
              <Input name="name" placeholder="Limpieza facial" required />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>€</Label>
              <Input name="price" type="number" step="0.01" placeholder="65" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Min</Label>
              <Input name="duration" type="number" placeholder="45" />
            </div>
            <div className="col-span-3">
              <Button type="submit" size="sm" className="w-full">+ Añadir</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Business hours */}
      <Card>
        <CardHeader><CardTitle>Horario de atención</CardTitle></CardHeader>
        <CardContent>
          <form action={saveHours} className="space-y-2">
            {DAYS.map((day, i) => {
              const h = (biz?.business_hours as BusinessHour[] | undefined)?.find((x) => x.day_of_week === i);
              const closed = h?.closed ?? (i === 0);
              return (
                <div key={day} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0">{day}</span>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      name={`open_${i}`}
                      value="true"
                      defaultChecked={!closed}
                    />
                    Abierto
                  </label>
                  <Input type="time" name={`open_time_${i}`} className="w-28" defaultValue={h?.open_time?.slice(0, 5) ?? "09:00"} />
                  <Input type="time" name={`close_${i}`} className="w-28" defaultValue={h?.close_time?.slice(0, 5) ?? "19:00"} />
                </div>
              );
            })}
            <Button type="submit" className="mt-2">Guardar horario</Button>
          </form>
        </CardContent>
      </Card>

      {/* WhatsApp / Twilio or Meta */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>Configura el proveedor para recibir y enviar mensajes.</CardDescription>
            </div>
            {biz?.whatsapp_provider === "meta"
              ? <Badge variant="outline" className="border-blue-400 text-blue-600">Meta Cloud API</Badge>
              : biz?.twilio_whatsapp_number
                ? <Badge variant="success">Twilio configurado</Badge>
                : <Badge variant="secondary">Sin configurar</Badge>
            }
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Twilio */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Opción A: Twilio</p>
            <form action={saveWhatsAppNumberForm} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="whatsapp_number">Número WhatsApp Twilio</Label>
                <Input
                  id="whatsapp_number"
                  name="whatsapp_number"
                  placeholder="+34600000000"
                  defaultValue={biz?.twilio_whatsapp_number ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label>Webhook URL para Twilio</Label>
                <code className="block rounded border bg-secondary/50 p-2 text-xs break-all">
                  {process.env.NEXT_PUBLIC_APP_URL ?? "https://tudominio.com"}/api/twilio/webhook
                </code>
              </div>
              <Button type="submit" size="sm">Guardar Twilio</Button>
            </form>
          </div>

          <div className="border-t" />

          {/* Meta Cloud API */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Opción B: Meta Cloud API</p>
            <form action={saveMetaProviderForm} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="meta_phone_number_id">Phone Number ID</Label>
                <Input
                  id="meta_phone_number_id"
                  name="meta_phone_number_id"
                  placeholder="123456789012345"
                  defaultValue={biz?.meta_phone_number_id ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meta_waba_id">WABA ID</Label>
                <Input
                  id="meta_waba_id"
                  name="meta_waba_id"
                  placeholder="987654321098765"
                  defaultValue={biz?.meta_waba_id ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label>Webhook URL para Meta</Label>
                <code className="block rounded border bg-secondary/50 p-2 text-xs break-all">
                  {process.env.NEXT_PUBLIC_APP_URL ?? "https://tudominio.com"}/api/meta/webhook
                </code>
              </div>
              <Button type="submit" size="sm">Guardar Meta</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
          <CardDescription>Necesario para el agendado automático de citas.</CardDescription>
        </CardHeader>
        <CardContent>
          {calendarConnected
            ? <Badge variant="success">Conectado</Badge>
            : <Link href="/api/google/connect"><Button>Conectar Google Calendar</Button></Link>
          }
        </CardContent>
      </Card>
    </div>
  );
}
