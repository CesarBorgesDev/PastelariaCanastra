#!/usr/bin/env bash
# Importa data/products.json no Postgres do VPS.
# Atualiza produtos pelo nome e cria os que não existem.
# Não apaga pedidos.
#
# No servidor, dentro do repositório:
#   sudo bash deploy/import-products.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/vps.env"
PRODUCTS_FILE="${REPO_DIR}/data/products.json"

if [[ ! -f "${PRODUCTS_FILE}" ]]; then
  echo "Arquivo ausente: data/products.json" >&2
  echo "Na máquina local, rode: bash deploy/export-products.sh" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose não está disponível." >&2
  exit 1
fi

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

export WEB_PORT="${WEB_PORT:-80}"
export POSTGRES_USER="${POSTGRES_USER:-pastelaria}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-pastelaria}"
export POSTGRES_DB="${POSTGRES_DB:-pastelaria}"

cd "${REPO_DIR}"

echo "==> Garantindo containers no ar"
docker compose up -d pastelaria-db pastelaria-backend
docker compose cp backend/src/import-products.js pastelaria-backend:/app/src/import-products.js

echo "==> Importando produtos"
docker compose exec -T pastelaria-backend node src/import-products.js < "${PRODUCTS_FILE}"
