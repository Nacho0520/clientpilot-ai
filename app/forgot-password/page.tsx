import type { Metadata } from "next";
import ForgotPasswordForm from "./form";

export const metadata: Metadata = {
  title: "Recuperar contraseña — ClientPilot AI",
  description: "Solicita un enlace de recuperación para tu cuenta ClientPilot AI.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
