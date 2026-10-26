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

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/env.sh"
load_pastelaria_env "${SCRIPT_DIR}" "${REPO_DIR}"

cd "${REPO_DIR}"

echo "==> Banco de dados"
docker compose up -d --wait pastelaria-db

# O volume guarda a senha da primeira criação. A conexão local do
# container não exige senha, então ela passa a ser a do deploy/vps.env.
echo "==> Alinhando a senha do usuário ${POSTGRES_USER}"
docker compose cp deploy/sync-db-password.sh pastelaria-db:/tmp/sync-db-password.sh
docker compose exec -T \
  -e POSTGRES_USER \
  -e POSTGRES_PASSWORD \
  -e POSTGRES_DB \
  pastelaria-db \
  sh /tmp/sync-db-password.sh

DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD_URL}@pastelaria-db:5432/${POSTGRES_DB}"
export DATABASE_URL

echo "==> Backend"
docker compose up -d --wait --force-recreate --no-deps pastelaria-backend
docker compose cp backend/src/import-products.js pastelaria-backend:/app/src/import-products.js
docker compose cp backend/src/catalog.js pastelaria-backend:/app/src/catalog.js
docker compose cp backend/src/db.js pastelaria-backend:/app/src/db.js
docker compose cp backend/src/text.js pastelaria-backend:/app/src/text.js

echo "==> Importando produtos"
docker compose exec -T -e DATABASE_URL="${DATABASE_URL}" \
  pastelaria-backend \
  node src/import-products.js < "${PRODUCTS_FILE}"
