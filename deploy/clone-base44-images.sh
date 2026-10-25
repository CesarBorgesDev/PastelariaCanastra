#!/usr/bin/env bash
# Baixa as imagens dos produtos no Base44 e grava no banco local.
# O volume do Postgres e a pasta data/uploads são mantidos.
#
# Coloque o token em deploy/vps.env:
#   BASE44_ACCESS_TOKEN=...
# Depois:
#   sudo bash deploy/clone-base44-images.sh
#
# O token é o valor de base44_access_token no navegador,
# com o app Base44 aberto e logado.

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash deploy/clone-base44-images.sh" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose não está disponível." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/vps.env"

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
export BASE44_APP_ID="${BASE44_APP_ID:-69ca7c6943d2142fad405526}"
export BASE44_ACCESS_TOKEN="${BASE44_ACCESS_TOKEN:-}"

if [[ -z "${BASE44_ACCESS_TOKEN}" ]]; then
  echo "Defina BASE44_ACCESS_TOKEN em deploy/vps.env." >&2
  echo "No app Base44 logado, o valor está em localStorage, chave base44_access_token." >&2
  exit 1
fi

cd "${REPO_DIR}"
mkdir -p data/uploads
chown -R 1000:1000 data/uploads

echo "==> Publicando a pasta de imagens"
docker compose up -d --build

echo "==> Clonando imagens do Base44"
docker compose exec -T \
  -e BASE44_ACCESS_TOKEN="${BASE44_ACCESS_TOKEN}" \
  -e BASE44_APP_ID="${BASE44_APP_ID}" \
  pastelaria-backend \
  node src/clone-images.js

echo
echo "Imagens em data/uploads e no cardápio, em /uploads/."
