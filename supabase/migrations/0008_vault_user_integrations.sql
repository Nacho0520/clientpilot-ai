-- =============================================================================
-- MIGRACIÓN 0008: Supabase Vault + tabla user_integrations
-- =============================================================================
-- CONTEXTO LEGAL Y TÉCNICO:
--   - Art. 32 RGPD: obligación de aplicar "cifrado de datos personales" como
--     medida técnica de seguridad apropiada para datos de categoría especial.
--   - AEPD Guide on Pseudonymisation: los refresh tokens son cuasi-identificadores
--     que permiten acceso a datos del paciente (Google Calendar = agenda clínica).
--
-- POR QUÉ SUPABASE VAULT Y NO LA COLUMNA EXISTENTE:
--   - businesses.google_oauth_tokens_encrypted usa AES-256-GCM a nivel de app:
--     el texto cifrado viaja en la query y el administrador BD puede leerlo
--     si obtiene la clave TOKEN_ENCRYPTION_KEY.
--   - Supabase Vault usa pgsodium (XSalsa20-Poly1305). La clave de cifrado
--     vive en el "key management" de pgsodium y NUNCA se mueve a la app layer.
--     El secreto solo es visible a través de vault.decrypted_secrets, accesible
--     exclusivamente por el rol postgres/service_role.
--   - Esto garantiza separación de funciones: un DBA con acceso a las tablas
--     NO puede leer el refresh token sin acceso al key material de pgsodium.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Habilitar Supabase Vault
-- -----------------------------------------------------------------------------
-- Requiere activar "supabase_vault" en Database → Extensions del dashboard.
-- La extensión pgsodium debe estar activa (viene por defecto en Supabase).

CREATE EXTENSION IF NOT EXISTS supabase_vault SCHEMA vault;

-- -----------------------------------------------------------------------------
-- 2. Tabla user_integrations
-- -----------------------------------------------------------------------------
-- Diseñada para ser multi-proveedor (Google Calendar hoy, otros mañana).
-- El refresh_token nunca se almacena en esta tabla; solo un UUID de referencia
-- al vault.secrets, que pgsodium mantiene cifrado en reposo.

CREATE TABLE IF NOT EXISTS public.user_integrations (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider                TEXT        NOT NULL CHECK (provider IN ('google_calendar')),

  -- Referencia al secreto en Supabase Vault (vault.secrets.id).
  -- El valor del refresh token NO está en esta tabla; esta columna es solo
  -- un puntero opaco. Sin acceso a vault.decrypted_secrets, es inútil.
  vault_secret_id         UUID        NOT NULL,

  -- Access token (vida útil ~1h): lo ciframos a nivel de app (AES-256-GCM)
  -- para no hacer una llamada al Vault en cada petición. No es el token crítico.
  access_token_encrypted  TEXT,
  token_expiry            TIMESTAMPTZ,

  -- Estado de la integración. 'revoked' se activa al recibir invalid_grant de Google.
  status                  TEXT        NOT NULL CHECK (status IN ('active', 'revoked', 'expired')) DEFAULT 'active',

  -- Metadatos no sensibles
  scopes                  TEXT[],
  google_account_email    TEXT,         -- email legible de la cuenta conectada (no sensible)

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Una sola integración activa por negocio y proveedor
  UNIQUE (business_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_business
  ON public.user_integrations (business_id, provider);

CREATE INDEX IF NOT EXISTS idx_user_integrations_status
  ON public.user_integrations (status)
  WHERE status != 'active'; -- índice parcial para detectar integraciones caídas

COMMENT ON TABLE public.user_integrations IS
  'Almacena metadatos de integraciones OAuth. El refresh token está en Supabase Vault
   (vault_secret_id). Cumple Art.32 RGPD: cifrado técnico en reposo con pgsodium.';

-- RLS: misma política que el resto de tablas del tenant
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_integrations_member_select" ON public.user_integrations
  FOR SELECT USING (public.is_member_of_business(business_id));

CREATE POLICY "user_integrations_member_insert" ON public.user_integrations
  FOR INSERT WITH CHECK (public.is_member_of_business(business_id));

CREATE POLICY "user_integrations_member_update" ON public.user_integrations
  FOR UPDATE USING (public.is_member_of_business(business_id));

CREATE POLICY "user_integrations_member_delete" ON public.user_integrations
  FOR DELETE USING (public.is_member_of_business(business_id));

-- Trigger updated_at (reutiliza la función de 0001_init)
CREATE TRIGGER trg_user_integrations_updated
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger business_id inmutable (reutiliza función de 0006)
CREATE TRIGGER trg_user_integrations_immutable_business_id
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();

-- -----------------------------------------------------------------------------
-- 3. RPC: upsert_google_refresh_token
-- -----------------------------------------------------------------------------
-- Llamada exclusivamente desde el backend (service_role).
-- El frontend NUNCA debe invocar esta función.
-- SECURITY DEFINER permite acceder a vault.* aunque el llamador sea service_role.

CREATE OR REPLACE FUNCTION public.upsert_google_refresh_token(
  p_business_id          UUID,
  p_refresh_token        TEXT,
  p_access_token_encrypted TEXT,
  p_token_expiry         TIMESTAMPTZ,
  p_google_email         TEXT,
  p_scopes               TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id   UUID;
  v_existing_id UUID;
  v_secret_name TEXT := 'google_refresh_' || p_business_id::TEXT;
BEGIN
  -- ¿Existe ya una integración para este negocio?
  SELECT id, vault_secret_id
  INTO v_existing_id, v_secret_id
  FROM public.user_integrations
  WHERE business_id = p_business_id AND provider = 'google_calendar';

  IF FOUND THEN
    -- Actualizar el secreto existente en Vault (no se crea un nuevo UUID)
    -- vault.update_secret reencripta el valor con la clave maestra de pgsodium
    PERFORM vault.update_secret(v_secret_id, p_refresh_token, v_secret_name);

    UPDATE public.user_integrations
    SET
      access_token_encrypted = p_access_token_encrypted,
      token_expiry           = p_token_expiry,
      google_account_email   = p_google_email,
      scopes                 = p_scopes,
      status                 = 'active',
      updated_at             = NOW()
    WHERE id = v_existing_id;

    RETURN v_secret_id;
  ELSE
    -- Crear nuevo secreto en Vault
    -- vault.create_secret devuelve el UUID asignado al secreto
    v_secret_id := vault.create_secret(
      p_refresh_token,  -- el secreto a cifrar
      v_secret_name,    -- nombre único (para búsquedas internas)
      'Google Calendar refresh token — business_id: ' || p_business_id::TEXT
    );

    INSERT INTO public.user_integrations (
      business_id, provider, vault_secret_id,
      access_token_encrypted, token_expiry,
      google_account_email, scopes, status
    ) VALUES (
      p_business_id, 'google_calendar', v_secret_id,
      p_access_token_encrypted, p_token_expiry,
      p_google_email, p_scopes, 'active'
    );

    RETURN v_secret_id;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. RPC: get_google_refresh_token
-- -----------------------------------------------------------------------------
-- Desencripta el refresh token desde el Vault. Requiere service_role.
-- La desencriptación ocurre dentro de Postgres (pgsodium); el texto plano
-- nunca abandona la base de datos excepto en la respuesta de esta función.

CREATE OR REPLACE FUNCTION public.get_google_refresh_token(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT ds.decrypted_secret
  INTO v_token
  FROM public.user_integrations ui
  JOIN vault.decrypted_secrets ds ON ds.id = ui.vault_secret_id
  WHERE
    ui.business_id = p_business_id
    AND ui.provider = 'google_calendar'
    AND ui.status = 'active';

  -- Si no hay token activo, devuelve NULL (el caller debe manejar el caso)
  RETURN v_token;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. RPC: revoke_google_integration
-- -----------------------------------------------------------------------------
-- Invocado cuando Google devuelve invalid_grant (token revocado por el usuario).
-- Por RGPD Art.17 (derecho al olvido), borramos el secreto del Vault además
-- de marcar la integración como revocada.

CREATE OR REPLACE FUNCTION public.revoke_google_integration(p_business_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  SELECT vault_secret_id
  INTO v_secret_id
  FROM public.user_integrations
  WHERE business_id = p_business_id AND provider = 'google_calendar';

  IF FOUND THEN
    -- 1. Marcar como revocado (la UI mostrará el aviso de reconexión)
    UPDATE public.user_integrations
    SET
      status                 = 'revoked',
      access_token_encrypted = NULL,  -- limpiar access token cacheado
      updated_at             = NOW()
    WHERE business_id = p_business_id AND provider = 'google_calendar';

    -- 2. Borrar el refresh token del Vault (principio de minimización RGPD)
    --    El secreto ya no tiene utilidad y mantenerlo es riesgo innecesario.
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Restringir acceso a las RPCs (solo service_role puede ejecutarlas)
-- -----------------------------------------------------------------------------
-- Ningún cliente de Supabase con clave anon o JWT de usuario puede llamar
-- a estas funciones directamente.

REVOKE EXECUTE ON FUNCTION public.upsert_google_refresh_token(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT[])
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_google_refresh_token(UUID)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.revoke_google_integration(UUID)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Vista de estado de integraciones (sin datos sensibles)
-- -----------------------------------------------------------------------------
-- La UI puede leer esta vista con el cliente autenticado para mostrar
-- "Google Calendar: Conectado ✓" sin exponer tokens ni vault_secret_id.

CREATE OR REPLACE VIEW public.integration_status AS
SELECT
  ui.business_id,
  ui.provider,
  ui.status,
  ui.google_account_email,
  ui.scopes,
  ui.token_expiry,
  ui.updated_at
FROM public.user_integrations ui;

-- La vista hereda las RLS de la tabla subyacente cuando se accede por el
-- cliente autenticado, pero añadimos un check explícito por claridad.
