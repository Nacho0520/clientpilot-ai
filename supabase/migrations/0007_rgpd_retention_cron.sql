-- =============================================================================
-- MIGRACIÓN 0007: Retención de Datos de Salud — pg_cron (RGPD + Ley 41/2002)
-- =============================================================================
-- CONTEXTO LEGAL:
--   - Ley 41/2002 (Autonomía del Paciente), Art. 17.1: las clínicas deben
--     conservar la documentación clínica un mínimo de 5 años desde el alta.
--   - Art. 5(1)(e) RGPD: limitación del plazo de conservación de datos personales.
--   - Art. 25 RGPD: privacidad por diseño — implementar el borrado automático
--     es la medida técnica que demuestra conformidad ante la AEPD.
--
-- ESTRATEGIA DE ANONIMIZACIÓN (mejor que borrado puro):
--   Eliminamos los datos personales identificativos (teléfono, nombre) pero
--   conservamos los registros anonimizados para que la clínica mantenga
--   estadísticas históricas de negocio. El contenido de mensajes de salud
--   se reemplaza por un marcador legal. Esto cumple RGPD sin destruir el
--   valor analítico del tenant.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Habilitar pg_cron (extensión de Supabase)
-- -----------------------------------------------------------------------------
-- Requiere que pg_cron esté activado en el dashboard de Supabase:
-- Database → Extensions → pg_cron → Enable
-- En el plan Free de Supabase, pg_cron está disponible desde 2024.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- El schema 'cron' solo es accesible por el rol postgres (service-role equiv.)
-- Los roles 'authenticated' y 'anon' NO tienen permisos sobre él.
GRANT USAGE ON SCHEMA cron TO postgres;

-- -----------------------------------------------------------------------------
-- 2. Función principal de anonimización RGPD
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER: se ejecuta con los permisos del propietario (postgres),
-- no del llamador. Esto garantiza que la función puede saltarse las RLS
-- para hacer el barrido cross-tenant, pero SOLO para anonimizar.

CREATE OR REPLACE FUNCTION public.rgpd_anonymize_stale_health_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Cutoff: 5 años desde el último mensaje o cita (Ley 41/2002 + RGPD Art.5.1.e)
  v_cutoff TIMESTAMPTZ := NOW() - INTERVAL '5 years';
  v_conv_count  INT := 0;
  v_msg_count   INT := 0;
  v_appt_count  INT := 0;
  v_result      JSONB;
BEGIN

  -- ---- PASO 1: Anonimizar conversaciones (datos identificativos del paciente) ----
  -- Eliminamos: número de teléfono, nombre, notas (pueden contener síntomas).
  -- Marcamos con rgpd_anonymized_at para que las RLS restrictivas las oculten.
  UPDATE public.conversations
  SET
    customer_phone            = 'RGPD_ANON_' || id::TEXT,
    customer_name             = 'Paciente Anonimizado',
    notes                     = NULL,
    status                    = 'closed',
    consent_whatsapp_at       = NULL,
    consent_data_processing_at = NULL,
    rgpd_anonymized_at        = NOW()
  WHERE
    last_message_at < v_cutoff
    AND rgpd_anonymized_at IS NULL;

  GET DIAGNOSTICS v_conv_count = ROW_COUNT;

  -- ---- PASO 2: Limpiar contenido de mensajes de las conversaciones afectadas ----
  -- Los mensajes pueden contener información clínica sensible intercambiada
  -- por WhatsApp (síntomas, diagnósticos mencionados). Los vaciamos.
  -- NO borramos la fila para mantener el recuento de mensajes del negocio.
  UPDATE public.messages
  SET
    content = '[Contenido eliminado — Política de retención RGPD/Ley 41/2002]',
    metadata = '{}'::JSONB
  WHERE
    sent_at < v_cutoff
    AND content != '[Contenido eliminado — Política de retención RGPD/Ley 41/2002]';

  GET DIAGNOSTICS v_msg_count = ROW_COUNT;

  -- ---- PASO 3: Anonimizar registros de citas (historial sanitario) ----
  -- Conservamos la estructura de la cita (fecha, duración, servicio) para
  -- que la clínica mantenga estadísticas de ocupación históricas.
  -- Eliminamos el nexo personal (teléfono + nombre).
  UPDATE public.appointments
  SET
    customer_phone    = 'RGPD_ANON_' || id::TEXT,
    customer_name     = 'Paciente Anonimizado',
    notes             = NULL,
    rgpd_anonymized_at = NOW()
  WHERE
    scheduled_at < v_cutoff
    AND rgpd_anonymized_at IS NULL;

  GET DIAGNOSTICS v_appt_count = ROW_COUNT;

  -- ---- PASO 4: Limpiar follow-up queue de conversaciones anonimizadas ----
  -- No tiene sentido mantener follow-ups programados para pacientes anonimizados.
  DELETE FROM public.follow_up_queue fq
  USING public.conversations c
  WHERE
    fq.conversation_id = c.id
    AND c.rgpd_anonymized_at IS NOT NULL;

  -- ---- PASO 5: Construir el resultado para auditoría ----
  v_result := jsonb_build_object(
    'executed_at',       NOW(),
    'cutoff_date',       v_cutoff,
    'conversations_anonymized', v_conv_count,
    'messages_cleared',  v_msg_count,
    'appointments_anonymized', v_appt_count,
    'legal_basis',       'Ley 41/2002 Art.17.1 + RGPD Art.5(1)(e)'
  );

  -- Loggear en el sistema para el Registro de Actividades de Tratamiento (RAT)
  RAISE NOTICE 'RGPD retention job: %', v_result::TEXT;

  RETURN v_result;
END;
$$;

-- Solo postgres puede ejecutar esta función (no authenticated, no anon)
REVOKE EXECUTE ON FUNCTION public.rgpd_anonymize_stale_health_data() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Tabla de auditoría de ejecuciones del job RGPD
-- -----------------------------------------------------------------------------
-- El Registro de Actividades de Tratamiento (RAT) exige poder demostrar a la
-- AEPD cuándo y con qué resultado se han ejecutado las purgas de datos.

CREATE TABLE IF NOT EXISTS public.rgpd_retention_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result       JSONB       NOT NULL,
  job_name     TEXT        NOT NULL DEFAULT 'rgpd-health-data-retention'
);

-- Solo el admin puede leer el log de retención (sensible operacionalmente)
ALTER TABLE public.rgpd_retention_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rgpd_log_admin_only" ON public.rgpd_retention_log
  FOR ALL
  USING (FALSE); -- ningún rol autenticado puede leer directamente; solo service_role

-- -----------------------------------------------------------------------------
-- 4. Wrapper que ejecuta la función Y guarda el resultado en el log
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rgpd_run_and_log()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.rgpd_anonymize_stale_health_data();
  INSERT INTO public.rgpd_retention_log (result) VALUES (v_result);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rgpd_run_and_log() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Programar el job con pg_cron
-- -----------------------------------------------------------------------------
-- Ejecución: día 1 de cada mes a las 03:00 UTC (fuera del horario de clínicas
-- españolas, que operan de 09:00 a 21:00 hora local).
--
-- ⚠️  NOTA: cron.schedule solo admite UN job con el mismo nombre. Si re-ejecutas
-- esta migración, primero hace unschedule para evitar duplicados.

SELECT cron.unschedule('rgpd-health-data-retention')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'rgpd-health-data-retention'
  );

SELECT cron.schedule(
  'rgpd-health-data-retention',          -- nombre único del job
  '0 3 1 * *',                            -- cron expression: 1er día del mes, 03:00 UTC
  $$SELECT public.rgpd_run_and_log()$$   -- llama al wrapper que loggea el resultado
);

-- Verificar que el job quedó registrado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rgpd-health-data-retention') THEN
    RAISE EXCEPTION 'ERROR: El job RGPD no se pudo registrar en pg_cron. Verifica que la extensión esté habilitada en el dashboard de Supabase.';
  END IF;
  RAISE NOTICE 'Job RGPD programado correctamente: 0 3 1 * * → public.rgpd_run_and_log()';
END $$;
