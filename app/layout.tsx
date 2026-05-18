import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { PostHogProvider, PostHogPageView } from "@/components/providers/posthog-provider";

export const metadata: Metadata = {
  title: "ClientPilot AI — Tu recepcionista IA en WhatsApp",
  description:
    "Responde, agenda y recupera clientes en WhatsApp automáticamente. Diseñado para clínicas estéticas y dentales.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <Script id="theme-init" strategy="beforeInteractive" src="/theme-init.js" />
      <body className="min-h-screen antialiased bg-background text-foreground">
        <PostHogProvider>
          <PostHogPageView />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
