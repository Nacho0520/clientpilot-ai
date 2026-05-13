import twilio, { type Twilio } from "twilio";
import { env } from "./env";

let _client: Twilio | null = null;
function getTwilio(): Twilio {
  if (!_client) _client = twilio(env.twilio.sid, env.twilio.token);
  return _client;
}

export async function sendWhatsApp(toPhone: string, body: string, fromPhone?: string) {
  const to = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;
  const from = fromPhone
    ? (fromPhone.startsWith("whatsapp:") ? fromPhone : `whatsapp:${fromPhone}`)
    : env.twilio.from;
  return getTwilio().messages.create({ from, to, body });
}
