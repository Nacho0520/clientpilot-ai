import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "notificaciones@clientpilot.ai";

export async function sendNewLeadNotification({
  to,
  businessName,
  customerName,
  customerPhone,
  conversationId,
}: {
  to: string;
  businessName: string;
  customerName: string | null;
  customerPhone: string;
  conversationId: string;
}) {
  if (!process.env.RESEND_API_KEY || !to) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/dashboard/conversations/${conversationId}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Nuevo lead en ${businessName}`,
    html: `
      <p>Tienes un nuevo lead en <strong>${businessName}</strong>:</p>
      <ul>
        <li><strong>Cliente:</strong> ${customerName ?? "Desconocido"}</li>
        <li><strong>Teléfono:</strong> ${customerPhone}</li>
      </ul>
      <p><a href="${link}">Ver conversación</a></p>
    `,
  });
}
