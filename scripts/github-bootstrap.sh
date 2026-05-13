#!/usr/bin/env bash
# Crea el repositorio en GitHub y hace push (requiere gh autenticado).
# Uso (desde la raíz del repo):
#   bash scripts/github-bootstrap.sh
#   bash scripts/github-bootstrap.sh mi-otro-nombre-repo
#
# Prerrequisito (una sola vez en tu Mac):
#   brew install gh   # si no lo tienes
#   gh auth login

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "Instala GitHub CLI: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Ejecuta primero en tu terminal: gh auth login"
  exit 1
fi

REPO_NAME="${1:-clientpilot-ai}"
LOGIN="$(gh api user -q .login)"
FULL="${LOGIN}/${REPO_NAME}"

if git remote get-url origin >/dev/null 2>&1; then
  git remote remove origin
fi

echo "Creando https://github.com/${FULL} y subiendo main..."
gh repo create "${FULL}" --public --source=. --remote=origin --push \
  --description "ClientPilot AI — recepcionista WhatsApp para clínicas"

echo "Hecho: https://github.com/${FULL}"
