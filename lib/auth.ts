import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the current session in Server Components and Server Actions.
 * Redirects to /login if not authenticated.
 */
export async function auth() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");
  return { user, supa };
}

/**
 * Resolves the current session in API Route Handlers.
 * Returns null if not authenticated (caller decides the response).
 */
export async function authApi() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  return { user, supa };
}
