#!/usr/bin/env bash
# Sincroniza variables de .env.local a Vercel (producción + preview).
# Uso: bash scripts/push-env-to-vercel.sh
#
# Requiere:
#   - vercel CLI instalado y autenticado (vercel whoami)
#   - .env.local relleno con tus claves reales
#   - Proyecto enlazado (vercel link ya ejecutado)
#
# Las vars marcadas como WORKER_ONLY se imprimen al final como recordatorio
# para copiarlas también en el servicio del worker (Railway, Render, etc.).

set -euo pipefail

ENV_FILE=".env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌  No se encontró $ENV_FILE. Cópialo de .env.example y rellena las claves."
  exit 1
fi

# Variables que también necesita el worker (además de la app en Vercel)
WORKER_VARS=(
  "ANTHROPIC_API_KEY"
  "ANTHROPIC_MODEL"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "REDIS_URL"
  "TWILIO_ACCOUNT_SID"
  "TWILIO_AUTH_TOKEN"
  "TWILIO_WHATSAPP_FROM"
  "META_SYSTEM_USER_TOKEN"
  "META_VERIFY_TOKEN"
  "TOKEN_ENCRYPTION_KEY"
  "RESEND_API_KEY"
  "RESEND_FROM_EMAIL"
  "NEXT_PUBLIC_APP_URL"
)

echo "📤  Subiendo variables a Vercel (producción + preview)..."
echo ""

pushed=0
skipped=0

while IFS= read -r line || [[ -n "$line" ]]; do
  # Ignorar comentarios y líneas vacías
  [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  # Ignorar vars vacías
  if [[ -z "$value" ]]; then
    echo "  ⚠️  $key — vacío, saltando"
    ((skipped++))
    continue
  fi

  # Añadir a producción y preview; eliminar si ya existe para evitar error
  echo "$value" | vercel env add "$key" production --force > /dev/null 2>&1 || true
  echo "$value" | vercel env add "$key" preview --force > /dev/null 2>&1 || true
  echo "  ✅  $key"
  ((pushed++))

done < "$ENV_FILE"

echo ""
echo "────────────────────────────────────────"
echo "  Subidas: $pushed  |  Saltadas (vacías): $skipped"
echo "────────────────────────────────────────"
echo ""
echo "🔑  Recuerda añadir también estas vars al servicio del WORKER (Railway/Render/Fly):"
echo ""
for v in "${WORKER_VARS[@]}"; do
  echo "    $v"
done
echo ""
echo "✅  Listo. Comprueba en https://vercel.com/dashboard que las vars están bien."
