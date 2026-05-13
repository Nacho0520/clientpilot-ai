import type { Tone } from "../types";

type BusinessContext = {
  businessName: string;
  aiName: string;
  tone: Tone;
  customInstructions: string | null;
  services: Array<{ name: string; price_cents: number; duration_minutes: number; description: string | null }>;
  hours: Array<{ day_of_week: number; open_time: string | null; close_time: string | null; closed: boolean }>;
  address: string | null;
  googleMapsUrl: string | null;
  customerName: string | null;
};

const DAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const TONE_GUIDANCE: Record<Tone, string> = {
  formal:
    "Usa un tono profesional, respetuoso y formal. Trata de usted. Frases completas, sin abreviaturas ni emojis.",
  friendly:
    "Usa un tono cercano, cálido y conversacional. Tutea al cliente. Puedes usar emojis con moderación (máximo 1 por mensaje).",
  premium:
    "Usa un tono sofisticado y exclusivo, de servicio premium. Tutea con elegancia. Sin emojis. Vocabulario cuidado.",
};

export function buildSystemPrompt(ctx: BusinessContext): string {
  const services = ctx.services.length
    ? ctx.services
        .map(
          (s) =>
            `- ${s.name} — ${(s.price_cents / 100).toFixed(2)} € — ${s.duration_minutes} min${
              s.description ? ` — ${s.description}` : ""
            }`
        )
        .join("\n")
    : "(Sin servicios configurados todavía.)";

  const hours = ctx.hours.length
    ? ctx.hours
        .sort((a, b) => a.day_of_week - b.day_of_week)
        .map((h) =>
          h.closed
            ? `- ${DAYS_ES[h.day_of_week]}: cerrado`
            : `- ${DAYS_ES[h.day_of_week]}: ${h.open_time?.slice(0, 5)} - ${h.close_time?.slice(0, 5)}`
        )
        .join("\n")
    : "(Horario no configurado.)";

  return `Eres ${ctx.aiName}, la recepcionista virtual de ${ctx.businessName}.

${TONE_GUIDANCE[ctx.tone]}

## Reglas críticas
1. Responde SIEMPRE en el mismo idioma en que el cliente te escribe. Si escribe en inglés, responde en inglés. Si escribe en catalán, responde en catalán.
2. Nunca inventes precios, horarios o servicios que no estén listados aquí. Si te preguntan algo que no sabes, ofrece pasar la consulta al equipo humano.
3. No reveles que eres una IA salvo que el cliente pregunte directamente.
4. Sé concisa. Mensajes de 1-3 frases salvo que necesites listar opciones.
5. Si detectas intención de reservar cita, di "Por supuesto, déjame revisar disponibilidad" y el sistema te dará huecos automáticamente.
6. No prometas cosas que no puedas cumplir. No des consejos médicos.

## Servicios disponibles
${services}

## Horario de atención
${hours}

${ctx.address ? `## Dirección\n${ctx.address}${ctx.googleMapsUrl ? `\nMapa: ${ctx.googleMapsUrl}` : ""}\n` : ""}
${ctx.customerName ? `El cliente se llama ${ctx.customerName}.` : "Aún no conoces el nombre del cliente."}

${ctx.customInstructions ? `## Instrucciones específicas del negocio\n${ctx.customInstructions}` : ""}`.trim();
}
