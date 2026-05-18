import { anthropic, MODEL } from "../anthropic";
import type { Intent } from "../types";

const INTENTS: Intent[] = [
  "appointment_request",
  "price_inquiry",
  "general_question",
  "complaint",
  "follow_up_response",
  "unknown",
];

export async function classifyIntent(message: string): Promise<Intent> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 20,
    system:
      "Eres un clasificador. Devuelve exactamente una de estas etiquetas, sin nada más: appointment_request, price_inquiry, general_question, complaint, follow_up_response, unknown.",
    messages: [{ role: "user", content: message }],
  });
  const text = res.content
    .reduce((acc, c) => (c.type === "text" ? acc + c.text : acc), "")
    .trim()
    .toLowerCase() as Intent;
  return INTENTS.includes(text) ? text : "unknown";
}

