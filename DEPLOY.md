# Despliegue de ClientPilot AI

## Procesos

Este proyecto requiere **dos procesos separados** corriendo simultáneamente:

1. **Servidor Next.js** — `pnpm run start` (o el comando de tu plataforma)
2. **Worker de tareas** — `pnpm run worker` (BullMQ + Redis para follow-ups automáticos)

Ambos deben estar corriendo. Si el worker no está activo, los recordatorios de cita y las peticiones de reseña no se enviarán.

---

## Orden recomendado de configuración

Sigue este orden al rellenar las variables. Los servicios marcados con ★ son los mínimos para ver la app funcionar.

| # | Servicio | Variables clave | Necesario para |
|---|----------|-----------------|----------------|
| 1 | **Supabase** ★ | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth + datos |
| 2 | **Redis** ★ | `REDIS_URL` | Worker BullMQ |
| 3 | **Claves locales** ★ | `TOKEN_ENCRYPTION_KEY` (`openssl rand -hex 32`), `CRON_SECRET` | Cifrado, cron |
| 4 | **WhatsApp** | Twilio o Meta (ver secciones) | Mensajería real |
| 5 | **Google Calendar** | `GOOGLE_OAUTH_*` | Reservas (clientes conectan el suyo) |
| 6 | **Resend** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Emails transaccionales |
| 7 | **Anthropic** | `ANTHROPIC_API_KEY` | Pipeline IA |
| 8 | **Sentry** | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Observabilidad errores |
| 9 | **PostHog** | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Analítica de producto |
| 10 | **Stripe** | `STRIPE_*` + quitar `BILLING_DISABLED=true` | Pagos (cuando tengas cuenta legal) |

---

## Facturación — modo sin Stripe

Mientras no tengas cuenta Stripe, añade estas variables en Vercel y Railway:

```
BILLING_DISABLED=true
NEXT_PUBLIC_BILLING_DISABLED=true
```

La app mostrará un aviso en la página de facturación y las rutas `/api/stripe/*` responderán `503`. El resto del producto funciona con normalidad.

Cuando tengas cuenta Stripe: quita esas dos variables y rellena las `STRIPE_*`.

---

## Variables de entorno por proceso

### Vercel (app Next.js)

Configura en **Vercel → Settings → Environment Variables** para los entornos Production y Preview.

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (sin barra final) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio Supabase (solo servidor) |
| `ANTHROPIC_API_KEY` | API key Claude |
| `REDIS_URL` | URL Redis (mismo que el worker) |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes hex |
| `CRON_SECRET` | Cadena larga; Vercel cron la envía como Bearer |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Email transaccional |
| `TWILIO_*` o `META_*` | WhatsApp (la vía elegida) |
| `GOOGLE_OAUTH_*` | OAuth Calendar |
| `BILLING_DISABLED` + `NEXT_PUBLIC_BILLING_DISABLED` | `true` mientras no haya Stripe |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` | Sentry (mismo DSN; el prefijo NEXT_PUBLIC_ expone al cliente) |
| `SENTRY_ENVIRONMENT` + `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `production` en prod, `preview` en previews |
| `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` | PostHog EU |

### Railway (worker)

Variables mínimas para que el worker arranque (las demás fallarán al usarse, no al arrancar):

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio Supabase |
| `REDIS_URL` | Railway inyecta `${{Redis.REDIS_URL}}` si enlazas el plugin Redis |
| `TOKEN_ENCRYPTION_KEY` | Mismo valor que en Vercel |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Para emails de recordatorio/reseña |
| `TWILIO_*` o `META_*` | Para envíos WhatsApp del worker |
| `SENTRY_DSN` | Sentry (solo servidor, sin prefijo NEXT_PUBLIC_) |
| `SENTRY_ENVIRONMENT` | `production` |
| `NEXT_PUBLIC_APP_URL` | Para URLs en emails/mensajes |

> **Nota:** `ANTHROPIC_API_KEY` no es requerida por el worker al arrancar. Añádela igualmente
> para cuando la uses en el futuro desde el worker.

---

## ⚠️ RGPD — Región de Supabase

Antes de publicar para clientes europeos, verifica que el proyecto Supabase esté en la región **eu-central-1 (Frankfurt)**. Ve a Supabase Dashboard → Settings → General → Region.

---

## Plataformas recomendadas

- **Vercel**: App Next.js. Detecta `pnpm-lock.yaml` y usa pnpm automáticamente.
- **Railway**: Redis + servicio worker. El build usa `Dockerfile.worker` y el arranque es `pnpm run worker` (ver `railway.toml`).
- **Render**: Crea dos "Web Services" desde el mismo repo.
- **Fly.io**: Usa `fly.toml` con procesos múltiples.

---

## GitHub (código + despliegues automáticos)

En la carpeta del repo ya hay historial Git local. Para crear el remoto y subir `main`:

1. Instala y autentica la CLI: `brew install gh` (si hace falta) y `gh auth login`.
2. Ejecuta: `bash scripts/github-bootstrap.sh`
   Crea `https://github.com/<tu-usuario>/clientpilot-ai` (público) y hace `git push`.

Después, en **Vercel** → tu proyecto → **Settings → Git**: conecta ese repositorio para que cada `push` a `main` despliegue automáticamente. El workflow `.github/workflows/ci.yml` ejecutará lint + build en cada PR.

---

## Vercel (app en producción)

1. Enlaza el repo: `vercel link` (o conecta el Git desde el dashboard).
2. Variables de entorno: copia las claves de la tabla anterior por entorno.
3. **Cron en plan Hobby**: Vercel permite como máximo una ejecución al día por cron. En `vercel.json` la ruta `/api/cron/followups` está programada a **una vez al día** (UTC). El worker en Railway ejecuta el escaneo horario por BullMQ.

Despliegue desde terminal (con sesión iniciada en Vercel CLI): `vercel --prod --yes`.

---

## Railway (worker + Redis)

La CLI requiere login interactivo la primera vez: `railway login`. Opcionalmente: `bash scripts/railway-worker-bootstrap.sh`.

1. En la carpeta del repo: `railway init --name clientpilot-worker`.
2. Añade **Redis** al proyecto (plugin "Redis"); Railway inyecta `REDIS_URL` automáticamente.
3. El build usa `Dockerfile.worker` (Node 22, `pnpm install --frozen-lockfile`) y el arranque `pnpm run worker` (ver `railway.toml`).
4. En **Variables** del servicio del worker, añade las variables de la tabla anterior.
5. Despliega: `railway up` o conecta GitHub a Railway para deploys automáticos.

Sin `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL` y `TOKEN_ENCRYPTION_KEY`, el worker no arrancará (`assertWorkerEnv()` en `workers/index.ts`).

---

## Observabilidad

### Sentry

- Crea un proyecto **Next.js** en [sentry.io](https://sentry.io) (región EU recomendada: `.de.sentry.io`).
- Copia el DSN desde Settings → Client Keys (DSN).
- Añade `NEXT_PUBLIC_SENTRY_DSN` y `SENTRY_DSN` (mismo valor) en Vercel y Railway.
- Para source maps en CI: añade `SENTRY_AUTH_TOKEN` (Settings → Auth Tokens), `SENTRY_ORG`, `SENTRY_PROJECT` en GitHub Secrets y en Vercel.

### PostHog

- Crea un proyecto en [app.posthog.com](https://app.posthog.com) seleccionando la región **EU** para cumplir RGPD.
- Copia Project API Key y usa `https://eu.i.posthog.com` como host.
- Añade `NEXT_PUBLIC_POSTHOG_KEY` y `NEXT_PUBLIC_POSTHOG_HOST` en Vercel.
- Para desactivar en local: deja `NEXT_PUBLIC_POSTHOG_KEY` vacío en `.env.local`.

### Eventos tracked automáticamente

| Evento | Cuándo | Implementado |
|--------|--------|--------------|
| `$pageview` | Cada cambio de ruta (SPA) | Sí (PostHogPageView) |
| `onboarding_completed` | Cuando el cliente completa el onboarding | Sí (server-side) |
| `signed_up` | En el callback de auth (pendiente de añadir en auth listener) | Patrón listo en `lib/posthog.ts` |
