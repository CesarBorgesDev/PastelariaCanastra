#!/usr/bin/env bash
# Exporta os produtos do banco local para data/products.json.
# Rode na máquina onde o container pastelaria-db está no ar:
#   bash deploy/export-products.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT_FILE="${REPO_DIR}/data/products.json"

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose não está disponível." >&2
  exit 1
fi

cd "${REPO_DIR}"
mkdir -p data

echo "==> Exportando produtos"
docker compose exec -T pastelaria-db \
  psql -U "${POSTGRES_USER:-pastelaria}" -d "${POSTGRES_DB:-pastelaria}" -v ON_ERROR_STOP=1 -c \
  "COPY (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)::text FROM (
     SELECT id, name, description, price::float8 AS price, category, image_url, available, created_at
     FROM products
     ORDER BY created_at
   ) t) TO STDOUT" > "${OUT_FILE}"

echo "Arquivo gravado em data/products.json"
echo "Envie este arquivo ao VPS e rode: sudo bash deploy/import-products.sh"
if [[ -d data/uploads ]] && find data/uploads -type f ! -name '.gitkeep' | grep -q .; then
  echo "Há imagens em data/uploads. Copie essa pasta junto para o servidor."
fi
