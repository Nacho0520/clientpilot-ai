# Despliegue de ClientPilot AI

## Procesos

Este proyecto requiere **dos procesos separados** corriendo simultáneamente:

1. **Servidor Next.js** — `npm run start` (o el comando de tu plataforma)
2. **Worker de tareas** — `npm run worker` (BullMQ + Redis para follow-ups automáticos)

Ambos deben estar corriendo. Si el worker no está activo, los recordatorios de cita y las peticiones de reseña no se enviarán.

## Variables de entorno requeridas

### Servidor y Worker
- `NEXT_PUBLIC_APP_URL` — URL pública de la app (ej. `https://app.clientpilot.ai`)
- `SUPABASE_URL` — URL del proyecto Supabase
- `SUPABASE_ANON_KEY` — Clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Clave de servicio de Supabase (solo servidor)
- `ANTHROPIC_API_KEY` — API key de Claude (Anthropic)
- `REDIS_URL` — URL de Redis (ej. `redis://localhost:6379`)

### WhatsApp / Twilio
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER` — Número sandbox o de producción Twilio

### WhatsApp / Meta Cloud API (alternativa a Twilio)
- `META_SYSTEM_USER_TOKEN` — Token de usuario del sistema de Meta
- `META_VERIFY_TOKEN` — Token de verificación para el webhook Meta (GET)
- `META_APP_SECRET` — App Secret de Meta; en producción el servidor exige validar `X-Hub-Signature-256` en el POST del webhook

### Google Calendar
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_ENCRYPTION_KEY` — Clave AES-256-GCM (32 bytes en hex)

### Stripe
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Email
- `RESEND_API_KEY`

## ⚠️ RGPD — Región de Supabase

Antes de publicar para clientes europeos, verifica que el proyecto Supabase esté en la región **eu-central-1 (Frankfurt)**. Ve a Supabase Dashboard → Settings → General → Region.

Si el proyecto está en otra región, migra los datos antes de lanzar para cumplir con el RGPD.

## Plataformas recomendadas

- **Vercel**: App Next.js (este repo). El worker **no** va en Vercel; va en Railway u otro servicio con proceso largo.
- **Railway**: Redis + servicio cuyo comando de arranque es `npm run worker` (ver `railway.toml` en la raíz).
- **Render**: Crea dos "Web Services" desde el mismo repo.
- **Fly.io**: Usa `fly.toml` con procesos múltiples.

---

## GitHub (código + despliegues automáticos)

En la carpeta del repo ya hay historial Git local. Para crear el remoto y subir `main`:

1. Instala y autentica la CLI: `brew install gh` (si hace falta) y `gh auth login`.
2. Ejecuta: `bash scripts/github-bootstrap.sh`  
   Crea `https://github.com/<tu-usuario>/clientpilot-ai` (público) y hace `git push`.

Después, en **Vercel** → tu proyecto → **Settings → Git**: conecta ese repositorio para que cada `push` a `main` despliegue solo.

---

## Vercel (app en producción)

1. Enlaza el repo: `vercel link` (o conecta el Git desde el dashboard).
2. Variables de entorno: copia las mismas claves que en `.env.local` (nombres exactos en `lib/env.ts`). Ajusta `NEXT_PUBLIC_APP_URL` al dominio real de Vercel (p. ej. `https://tu-proyecto.vercel.app`).
3. **Cron en plan Hobby**: Vercel solo permite **como máximo una ejecución al día** por cron. En `vercel.json` la ruta `/api/cron/followups` está programada a **una vez al día** (UTC). El worker en Railway puede seguir ejecutando el escaneo horario por BullMQ. El endpoint de cron exige cabecera `Authorization: Bearer CRON_SECRET`; define `CRON_SECRET` en el proyecto Vercel (Cron Jobs usa esa auth al invocar la URL).

Despliegue desde terminal (con sesión iniciada en Vercel CLI): `vercel --prod --yes`.

---

## Railway (worker + Redis)

La CLI requiere login interactivo la primera vez: `railway login`. Opcionalmente, tras autenticarte: `bash scripts/railway-worker-bootstrap.sh` (crea/enlaza proyecto, intenta añadir Redis y resume pasos).

1. En la carpeta del repo: `railway init --name clientpilot-worker` (o crea el proyecto en la web y **New service → Empty** desde el mismo repo).
2. Añade **Redis** al proyecto (plugin “Redis”); Railway inyecta `REDIS_URL` en el servicio que enlaces, o copia la URL manualmente en las variables del worker.
3. Crea un servicio con **root directory** el repo. El build usa **`Dockerfile.worker`** (Node 22, `npm ci`, sin `next build`) y el arranque `npm run worker` (ver `railway.toml`).
4. En **Variables** del servicio del worker, pega las mismas claves que necesita `lib/env.ts` (Supabase service role, Anthropic, Twilio, Redis, Resend, `TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL` con la URL de Vercel, etc.).
5. Despliega: `railway up` desde el repo o push si conectaste GitHub a Railway.

Sin Redis y sin variables completas el worker **no arrancará** (`assertEnv()` en `workers/index.ts`).
