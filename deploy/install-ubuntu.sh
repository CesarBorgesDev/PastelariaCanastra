#!/usr/bin/env bash
# Sobe Pastelaria Canastra no Ubuntu 22.04 ou 24.04 com Docker:
# pastelaria-frontend, pastelaria-backend e pastelaria-db.
#
# No servidor, dentro do repositório:
#   cp deploy/vps.env.example deploy/vps.env
#   nano deploy/vps.env
#   sudo bash deploy/install-ubuntu.sh
#
# Depois de cada git pull, rode o script de novo para rebuildar.

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash deploy/install-ubuntu.sh" >&2
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
export ENABLE_UFW="${ENABLE_UFW:-false}"
export DEBIAN_FRONTEND=noninteractive

echo "==> Docker"
apt-get update
apt-get install -y ca-certificates curl docker.io docker-compose-v2
systemctl enable --now docker

echo "==> Containers"
cd "${REPO_DIR}"
docker compose up -d --build

if [[ "${ENABLE_UFW}" == "true" ]] && command -v ufw >/dev/null 2>&1; then
  echo "==> UFW"
  ufw allow OpenSSH
  ufw allow "${WEB_PORT}/tcp"
  ufw --force enable
fi

echo
docker compose ps
echo
echo "Site publicado na porta ${WEB_PORT}."
echo "Containers: pastelaria-frontend, pastelaria-backend, pastelaria-db."
