import type { Metadata } from "next";
import ResetPasswordForm from "./form";

export const metadata: Metadata = {
  title: "Nueva contraseña — ClientPilot AI",
  description: "Establece una nueva contraseña para tu cuenta ClientPilot AI.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
