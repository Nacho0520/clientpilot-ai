import { NextResponse, type NextRequest } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import type Anthropic from "@anthropic-ai/sdk";

// No server-side rate limiting is applied here. In-memory Maps reset on every
// cold start and provide no protection in serverless deployments. Apply a
// platform-level rate limiter (e.g. Vercel WAF or Upstash Ratelimit) before
// exposing this endpoint in production.

const DEMO_SYSTEM = `Eres Sofía, recepcionista virtual de Clínica Demo, una clínica estética en Madrid.
Servicios disponibles:
- Limpieza facial — 65€ — 45 min
- Tratamiento de ácido hialurónico — 280€ — 30 min
- Depilación láser (sesión) — 90€ — 30 min
- Peeling químico — 120€ — 45 min

Horario: Lunes a viernes 9:00-19:00, sábados 10:00-14:00. Cerrado domingos.
Dirección: Calle Demo 12, Madrid.

Tono: cercano y profesional. Tutea. Mensajes breves (1-3 frases).
Responde siempre en el idioma del cliente.
Si te piden cita, di que vas a revisar disponibilidad y propón un par de huecos ficticios.
No reveles que eres una IA salvo que te lo pregunten directamente.`;

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: Array<{ role: "user" | "assistant"; content: string }> };
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: DEMO_SYSTEM,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const reply = res.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim();
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "Disculpa, hubo un problema técnico." }, { status: 500 });
  }
}
