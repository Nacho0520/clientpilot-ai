/**
 * app/api/google/callback/route.ts
 *
 * Callback OAuth 2.0 de Google Calendar.
 *
 * FLUJO:
 *   1. Google redirige aquí con ?code=...&state=<business_id>
 *   2. Intercambiamos el code por access_token + refresh_token
 *   3. El refresh_token se almacena en Supabase Vault (pgsodium)
 *   4. El access_token se cifra con AES-256-GCM y se cachea en user_integrations
 *
 * SEGURIDAD (Art. 32 RGPD):
 *   - access_type=offline en generateAuthUrl (lib/calendar/google.ts) garantiza
 *     que Google entregue el refresh_token en esta respuesta.
 *   - prompt=consent fuerza la pantalla de consentimiento aunque el usuario ya
 *     hubiera autorizado antes, asegurando entrega del refresh_token.
 *   - El state param contiene el business_id (UUID validado antes de usar).
 *   - Ningún token se expone en URL, cookies o logs.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { oauth2Client, encryptTokens, type StoredTokens } from "@/lib/calendar/google";
import { storeGoogleTokens } from "@/lib/calendar/tokens";
import { createAdminClient } from "@/lib/supabase/admin";

// UUID v4 regex para validar el parámetro state antes de usarlo como business_id
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Legacy: mantiene sincronizado el campo google_oauth_tokens_encrypted mientras
// booking.ts lo use directamente. TODO: migrar booking.ts a lib/calendar/tokens.ts.
async function syncLegacyTokenField(businessId: string, tokens: StoredTokens) {
  const supa = createAdminClient();
  await supa
    .from("businesses")
    .update({
      google_oauth_tokens_encrypted: encryptTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date ?? undefined,
      }),
      google_oauth_invalid: false,
    })
    .eq("id", businessId);
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // contiene el business_id

  // ── Validación de parámetros ──────────────────────────────────────────────
  if (!code || !state) {
    return new NextResponse("Parámetros code/state requeridos", { status: 400 });
  }

  if (!UUID_REGEX.test(state)) {
    return new NextResponse("Parámetro state inválido", { status: 400 });
  }

  const businessId = state;

  // ── Verificar que el business_id existe (evita oracle de enumeración) ────
  const supa = createAdminClient();
  const { data: business } = await supa
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .single();

  if (!business) {
    return new NextResponse("Negocio no encontrado", { status: 404 });
  }

  // ── Intercambio code → tokens ─────────────────────────────────────────────
  const oauth = oauth2Client();
  let tokens: StoredTokens | undefined;

  try {
    const result = await oauth.getToken(code);
    tokens = result.tokens as StoredTokens | undefined;
  } catch (err) {
    console.error("[google/callback] Error al intercambiar code:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings?google=error&reason=code_exchange", appUrl)
    );
  }

  if (!tokens?.access_token || !tokens.refresh_token) {
    // Sin refresh_token significa que el usuario ya había autorizado la app
    // y no se añadió prompt=consent. Forzar reconexión con parámetro adecuado.
    console.error(
      "[google/callback] Google no devolvió refresh_token. " +
        "Asegúrate de que generateAuthUrl incluye access_type=offline y prompt=consent."
    );
    return NextResponse.redirect(
      new URL("/dashboard/settings?google=error&reason=no_refresh_token", appUrl)
    );
  }

  // ── Obtener email de la cuenta Google conectada (opcional pero útil en UI) ─
  let googleEmail: string | undefined;
  try {
    oauth.setCredentials(tokens);
    const oauth2 = (await import("googleapis")).google.oauth2({ version: "v2", auth: oauth });
    const { data: userInfo } = await oauth2.userinfo.get();
    googleEmail = userInfo.email ?? undefined;
  } catch {
    // No crítico: el email es solo para mostrar en la UI
  }

  // ── Almacenar en Supabase Vault (nuevo sistema) ───────────────────────────
  try {
    await storeGoogleTokens(
      businessId,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date ?? undefined,
      },
      googleEmail
    );
  } catch (err) {
    console.error("[google/callback] Error al guardar tokens en Vault:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings?google=error&reason=vault_storage", appUrl)
    );
  }

  await syncLegacyTokenField(businessId, tokens);

  return NextResponse.redirect(
    new URL("/dashboard/settings?google=connected", appUrl)
  );
}
