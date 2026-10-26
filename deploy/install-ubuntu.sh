#!/usr/bin/env bash
# Sobe Pastelaria Canastra no Ubuntu 22.04 ou 24.04 com Docker:
# pastelaria-frontend, pastelaria-backend e pastelaria-db.
#
# No servidor, dentro do repositório:
#   cp deploy/vps.env.example deploy/vps.env
#   nano deploy/vps.env
#   sudo bash deploy/install-ubuntu.sh
#
# Para atualizar o código depois, use: sudo bash deploy/update.sh

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash deploy/install-ubuntu.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/vps.env"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/env.sh"
load_pastelaria_env "${SCRIPT_DIR}" "${REPO_DIR}"
export ENABLE_UFW="${ENABLE_UFW:-false}"
export DEBIAN_FRONTEND=noninteractive

echo "==> Docker"
if docker compose version >/dev/null 2>&1; then
  echo "Docker Compose já instalado: $(docker compose version)"
else
  apt-get update
  apt-get install -y ca-certificates curl
  if ! command -v docker >/dev/null 2>&1; then
    apt-get install -y docker.io
  fi
  # O pacote docker-compose-plugin (repositório oficial do Docker) ocupa o mesmo
  # arquivo que docker-compose-v2. Não instale os dois.
  if dpkg -s docker-compose-plugin >/dev/null 2>&1; then
    echo "O pacote docker-compose-plugin já fornece o comando docker compose." >&2
    exit 1
  fi
  apt-get install -y docker-compose-v2
fi
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
