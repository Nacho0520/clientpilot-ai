import { createClient } from "@supabase/supabase-js";

// Service-role client. Server-only. Bypasses RLS — use only in trusted server code
// (webhooks, workers) and always scope queries by business_id explicitly.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
