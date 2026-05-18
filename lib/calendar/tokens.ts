/**
 * lib/calendar/tokens.ts
 *
 * Gestión de tokens OAuth de Google Calendar usando Supabase Vault.
 *
 * ARQUITECTURA DE SEGURIDAD (Art. 32 RGPD):
 *   - Refresh token: almacenado cifrado con pgsodium (XSalsa20-Poly1305) en
 *     vault.secrets. La clave de cifrado vive en el key management de pgsodium
 *     y NUNCA sale de la capa de base de datos.
 *   - Access token: cifrado a nivel de app (AES-256-GCM) y cacheado en
 *     user_integrations.access_token_encrypted. Tiene vida útil de ~1h.
 *   - El frontend NUNCA recibe ninguno de los dos tokens.
 *
 * FLUJO DE RECONEXIÓN (invalid_grant):
 *   Google devuelve HTTP 400 + {"error":"invalid_grant"} cuando el usuario
 *   revoca el acceso desde myaccount.google.com. Esta clase lo detecta,
 *   marca la integración como 'revoked' en BD y lanza GoogleRevokedError
 *   para que el caller pueda notificar al usuario en la UI.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/crypto";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type IntegrationStatus = "active" | "revoked" | "expired";

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}

interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface GoogleErrorResponse {
  error: string;
  error_description?: string;
}

// ─── Error tipado para integración revocada ───────────────────────────────────

/**
 * Se lanza cuando Google devuelve invalid_grant.
 * El caller debe capturar este error específico para mostrar el banner
 * de reconexión en el dashboard de la clínica.
 */
class GoogleRevokedError extends Error {
  readonly businessId: string;

  constructor(businessId: string) {
    super(
      "La integración con Google Calendar fue revocada por el usuario. " +
        "Reconéctela desde Configuración → Integraciones."
    );
    this.name = "GoogleRevokedError";
    this.businessId = businessId;
  }
}

// ─── Almacenamiento de tokens ─────────────────────────────────────────────────

/**
 * Guarda (o actualiza) los tokens OAuth en Supabase Vault.
 * Llamar desde el callback de Google OAuth ÚNICAMENTE en el servidor.
 *
 * @param businessId   UUID del negocio (tenant)
 * @param tokens       Objeto con access_token + refresh_token de Google
 * @param googleEmail  Email de la cuenta Google conectada (visible en UI)
 */
export async function storeGoogleTokens(
  businessId: string,
  tokens: GoogleTokens,
  googleEmail?: string
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc("upsert_google_refresh_token", {
    p_business_id: businessId,
    p_refresh_token: tokens.refresh_token,
    // El access token se cifra a nivel de app antes de guardar en la columna
    p_access_token_encrypted: encrypt(tokens.access_token),
    p_token_expiry: tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null,
    p_google_email: googleEmail ?? null,
    p_scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  if (error) {
    throw new Error(`[tokens] Error al almacenar tokens en Vault: ${error.message}`);
  }
}

// ─── Obtención de access token válido ─────────────────────────────────────────

/**
 * Devuelve un access token válido para el negocio dado.
 * Si el access token cacheado ha expirado (o está a menos de 5 min de expirar),
 * lo refresca automáticamente usando el refresh token del Vault.
 *
 * @throws {GoogleRevokedError}  Si el usuario revocó el acceso en Google.
 * @throws {Error}               Para cualquier otro error de red o de BD.
 */
async function getValidAccessToken(businessId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: integration, error } = await supabase
    .from("user_integrations")
    .select("status, access_token_encrypted, token_expiry")
    .eq("business_id", businessId)
    .eq("provider", "google_calendar")
    .single();

  if (error || !integration) {
    throw new Error(
      `[tokens] Google Calendar no conectado para business ${businessId}`
    );
  }

  if (integration.status === "revoked") {
    throw new GoogleRevokedError(businessId);
  }

  // Buffer de 5 minutos: si el token expira en menos de 5 min, lo refrescamos
  const fiveMinutesMs = 5 * 60 * 1000;
  const hasValidCachedToken =
    integration.access_token_encrypted &&
    integration.token_expiry &&
    new Date(integration.token_expiry).getTime() > Date.now() + fiveMinutesMs;

  if (hasValidCachedToken) {
    return decrypt(integration.access_token_encrypted as string);
  }

  // Access token expirado → refrescar con el refresh token del Vault
  return refreshAccessToken(businessId);
}

// ─── Refresco de access token ─────────────────────────────────────────────────

/**
 * Usa el refresh token almacenado en Supabase Vault para obtener un nuevo
 * access token de Google. Actualiza el caché en user_integrations.
 *
 * Este proceso ocurre completamente en el servidor. El refresh token se
 * desencripta dentro de Postgres, se envía a Google sobre TLS, y el nuevo
 * access token se reencripta antes de almacenarse.
 *
 * @throws {GoogleRevokedError}  Si Google devuelve invalid_grant.
 */
async function refreshAccessToken(businessId: string): Promise<string> {
  const supabase = createAdminClient();

  // 1. Recuperar refresh token desde Vault (desencriptado por pgsodium)
  const { data: refreshToken, error: vaultError } = await supabase.rpc(
    "get_google_refresh_token",
    { p_business_id: businessId }
  );

  if (vaultError || !refreshToken) {
    throw new Error(
      `[tokens] No se pudo recuperar el refresh token del Vault para business ${businessId}`
    );
  }

  // 2. Solicitar nuevo access token a Google
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });

  // 3. Manejar errores de Google
  if (!response.ok) {
    const errorBody = (await response.json()) as GoogleErrorResponse;

    if (errorBody.error === "invalid_grant") {
      // El usuario eliminó el acceso desde su cuenta de Google.
      // Marcamos como revocado Y borramos el secreto del Vault (RGPD Art.17).
      await supabase.rpc("revoke_google_integration", {
        p_business_id: businessId,
      });
      throw new GoogleRevokedError(businessId);
    }

    throw new Error(
      `[tokens] Fallo al refrescar token de Google: ${errorBody.error} — ${errorBody.error_description ?? response.statusText}`
    );
  }

  // 4. Actualizar caché del access token en user_integrations
  const newTokens = (await response.json()) as GoogleRefreshResponse;
  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);

  const { error: updateError } = await supabase
    .from("user_integrations")
    .update({
      access_token_encrypted: encrypt(newTokens.access_token),
      token_expiry: newExpiry.toISOString(),
      status: "active",
    })
    .eq("business_id", businessId)
    .eq("provider", "google_calendar");

  if (updateError) {
    // Error no crítico: el access token es válido aunque no se cacheó
    console.error(
      `[tokens] Warning: No se pudo actualizar el caché del access token: ${updateError.message}`
    );
  }

  return newTokens.access_token;
}

// ─── Helpers públicos ─────────────────────────────────────────────────────────

/**
 * Comprueba si el negocio tiene Google Calendar conectado y activo.
 * Seguro para usar en Server Components (no expone tokens).
 */
async function hasActiveGoogleIntegration(
  businessId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_integrations")
    .select("status")
    .eq("business_id", businessId)
    .eq("provider", "google_calendar")
    .single();

  return data?.status === "active";
}

/**
 * Marca manualmente una integración como revocada.
 * Útil para el botón "Desconectar Calendar" en el dashboard.
 */
async function disconnectGoogleIntegration(
  businessId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("revoke_google_integration", {
    p_business_id: businessId,
  });
  if (error) {
    throw new Error(`[tokens] Error al desconectar integración: ${error.message}`);
  }
}
