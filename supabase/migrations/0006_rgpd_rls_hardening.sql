-- =============================================================================
-- MIGRACIÓN 0006: RLS Hardening + Campos de Auditoría RGPD
-- =============================================================================
-- CONTEXTO LEGAL:
--   - Art. 5 RGPD: Integridad y confidencialidad (principio de seguridad).
--   - Art. 25 RGPD: Privacidad por diseño y por defecto.
--   - Ley 41/2002: Requiere trazabilidad del consentimiento del paciente.
--   - LOPDGDD: Categorías especiales de datos (salud) requieren medidas reforzadas.
--
-- ESTA MIGRACIÓN:
--   1. Añade campos de auditoría de consentimiento a conversations y appointments.
--   2. Refuerza la inmutabilidad del business_id (previene tenant hopping).
--   3. Añade un índice de retención para que el cron job sea eficiente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columnas de auditoría de consentimiento
-- -----------------------------------------------------------------------------
-- Art. 7 RGPD: el responsable debe poder demostrar que el interesado prestó
-- su consentimiento. Guardamos cuándo se registró el consentimiento del
-- paciente a recibir comunicaciones por WhatsApp.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS consent_whatsapp_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_data_processing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rgpd_anonymized_at   TIMESTAMPTZ;

COMMENT ON COLUMN public.conversations.consent_whatsapp_at IS
  'Timestamp en que el paciente otorgó consentimiento expreso para comunicaciones
   WhatsApp (LSSI art.21 + LOPDGDD). Obligatorio antes del primer mensaje comercial.';

COMMENT ON COLUMN public.conversations.consent_data_processing_at IS
  'Timestamp del consentimiento al tratamiento de datos de salud (RGPD Art.9).
   Debe acompañarse del canal de captación (p.ej. formulario web, presencial).';

COMMENT ON COLUMN public.conversations.rgpd_anonymized_at IS
  'Timestamp en que el registro fue anonimizado por el job de retención RGPD.
   NULL indica que los datos aún están activos dentro del período de retención.';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS rgpd_anonymized_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.rgpd_anonymized_at IS
  'Timestamp de anonimización por política de retención Ley 41/2002 (5 años).';

-- -----------------------------------------------------------------------------
-- 2. Trigger: inmutabilidad de business_id
-- -----------------------------------------------------------------------------
-- Previene el "tenant hopping": un atacante que logre UPDATE no puede reasignar
-- una fila a otro business_id para filtrar datos de otro tenant.

CREATE OR REPLACE FUNCTION public.prevent_business_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
    RAISE EXCEPTION 'business_id es inmutable. Intento de cambio bloqueado por política de seguridad multi-tenant.';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT UNNEST(ARRAY[
    'services', 'business_hours', 'business_settings', 'conversations',
    'messages', 'appointments', 'follow_up_queue'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_immutable_business_id ON public.%1$s;
       CREATE TRIGGER trg_%1$s_immutable_business_id
         BEFORE UPDATE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();',
      t
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Índices de retención para el cron job de RGPD (migración 0007)
-- -----------------------------------------------------------------------------
-- Estos índices hacen que las queries de anonimización (WHERE last_message_at < X)
-- sean O(log n) en vez de seq scan sobre millones de filas.

CREATE INDEX IF NOT EXISTS idx_conversations_retention
  ON public.conversations (last_message_at)
  WHERE rgpd_anonymized_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_retention
  ON public.appointments (scheduled_at)
  WHERE rgpd_anonymized_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_retention
  ON public.messages (sent_at);

-- -----------------------------------------------------------------------------
-- 4. Política RLS adicional: denied-by-default para datos anonimizados
-- -----------------------------------------------------------------------------
-- Un usuario autenticado NO debe poder leer conversaciones ya anonimizadas
-- si la clínica ha cerrado su cuenta. Esta política refuerza el aislamiento
-- temporal post-anonimización.

CREATE POLICY "conversations_hide_anonymized" ON public.conversations
  AS RESTRICTIVE
  FOR SELECT
  USING (rgpd_anonymized_at IS NULL);

CREATE POLICY "appointments_hide_anonymized" ON public.appointments
  AS RESTRICTIVE
  FOR SELECT
  USING (rgpd_anonymized_at IS NULL);
