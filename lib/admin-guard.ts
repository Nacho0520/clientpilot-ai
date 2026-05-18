import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ADMIN_EMAIL = "hemmings.nacho@gmail.com";

export async function requireAdmin() {
  const { user } = await auth();
  if (user.email !== ADMIN_EMAIL) redirect("/dashboard");
  return user;
}
