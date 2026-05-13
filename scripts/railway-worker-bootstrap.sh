#!/usr/bin/env bash
# Prepara el worker en Railway (requiere sesión: railway login).
# Tras el login, puedes ejecutar este script para crear proyecto, Redis y
# recordatorio de variables. Ajusta a mano en el dashboard si hace falta.
#
# Uso: bash scripts/railway-worker-bootstrap.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v railway >/dev/null 2>&1; then
  echo "Instala Railway CLI: npm i -g @railway/cli"
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Primero ejecuta en tu terminal: railway login"
  exit 1
fi

echo "Creando / enlazando proyecto Railway (nombre clientpilot-worker)..."
railway init --name clientpilot-worker || true

echo "Añadiendo Redis al proyecto (si no existe ya)..."
railway add --database redis || echo "(Si Redis ya existe, ignora el aviso anterior.)"

echo ""
echo "Siguientes pasos manuales en https://railway.app :"
echo "  1. Crea o selecciona el servicio Node desde ESTE repo (root)."
echo "  2. Start command: npm run worker (ya está en railway.toml)."
echo "  3. Variables: copia desde .env.example / lib/env.ts (mismas que el worker necesita)."
echo "  4. REDIS_URL: Railway la inyecta al enlazar Redis al servicio, o pégala desde el plugin."
echo "  5. Despliega: railway up"
echo ""
