import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

const ADMIN_EMAIL = "hemmings.nacho@gmail.com";

export async function requireAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/dashboard");
  return user;
}
