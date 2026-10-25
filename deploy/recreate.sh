#!/usr/bin/env bash
# Recria os containers da Pastelaria Canastra a partir do código que já está no servidor.
# Não faz git pull e não apaga o volume do Postgres.
#
# No servidor, dentro do repositório:
#   sudo bash deploy/recreate.sh

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash deploy/recreate.sh" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose não está disponível. Rode antes: sudo bash deploy/install-ubuntu.sh" >&2
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

cd "${REPO_DIR}"

echo "==> Recriando containers"
docker compose up -d --build --force-recreate --remove-orphans

echo
docker compose ps
echo
echo "Containers recriados: pastelaria-frontend, pastelaria-backend, pastelaria-db."
echo "O volume do banco foi mantido. Site na porta ${WEB_PORT}."
