import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientPilot AI — Tu recepcionista IA en WhatsApp",
  description:
    "Responde, agenda y recupera clientes en WhatsApp automáticamente. Diseñado para clínicas estéticas y dentales.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
