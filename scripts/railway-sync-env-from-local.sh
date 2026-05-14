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

echo "Listo. Despliega: railway up --detach"
echo "REDIS_URL debe seguir como referencia a Redis (no la sobrescribas desde .env.local)."
