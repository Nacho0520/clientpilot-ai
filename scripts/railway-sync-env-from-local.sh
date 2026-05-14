#!/usr/bin/env bash
# Copia variables desde .env.local al servicio Railway "worker" (no toca REDIS_URL).
# Uso: bash scripts/railway-sync-env-from-local.sh
# Requiere: railway login, railway service link worker, y .env.local relleno.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE=".env.local"

if ! railway whoami >/dev/null 2>&1; then
  echo "Ejecuta: railway login"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No existe $ENV_FILE"
  exit 1
fi

echo "Subiendo variables al servicio worker (saltando REDIS_URL y líneas vacías)..."
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  key="${key%"${key##*[![:space:]]}"}"; key="${key#"${key%%[![:space:]]*}"}"
  [[ "$key" == "REDIS_URL" ]] && continue
  [[ -z "$value" ]] && continue
  printf '%s' "$value" | railway variable set "$key" --stdin --service worker --skip-deploys >/dev/null
  echo "  ok $key"
done < "$ENV_FILE"

echo "Listo. Comprobando variables mínimas del worker (assertWorkerEnv)…"
VAR_JSON=$(railway variable list --service worker --json)
MISSING=()
for key in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY TOKEN_ENCRYPTION_KEY REDIS_URL; do
  if ! echo "$VAR_JSON" | jq -e --arg k "$key" 'has($k) and (.[$k] != null and ((.[$k] | tostring) | length > 0))' >/dev/null 2>&1; then
    MISSING+=("$key")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo ""
  echo "ERROR: Faltan variables en Railway (servicio worker): ${MISSING[*]}"
  echo "  → Cópialas desde Supabase Dashboard (Settings → API) y genera TOKEN_ENCRYPTION_KEY con: openssl rand -hex 32"
  echo "  → Puedes añadirlas en el dashboard de Railway o rellenarlas en .env.local y volver a ejecutar este script."
  exit 1
fi

echo "Variables mínimas del worker: OK."
echo "Despliega: railway up --detach"
echo "REDIS_URL debe seguir como referencia a Redis (no la sobrescribas desde .env.local)."
