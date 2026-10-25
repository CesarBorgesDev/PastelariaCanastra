#!/usr/bin/env bash
# Atualiza o código da Pastelaria Canastra e recria os containers.
# O volume do Postgres (pastelaria-db) é mantido.
#
# No servidor, dentro do repositório:
#   sudo bash deploy/update.sh

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash deploy/update.sh" >&2
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

if [[ ! -d .git ]]; then
  echo "Este diretório não é um repositório git: ${REPO_DIR}" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Há alterações locais. Faça commit ou descarte antes de atualizar." >&2
  git status --short
  exit 1
fi

echo "==> Atualizando código"
GIT_USER="${SUDO_USER:-}"
if [[ -n "${GIT_USER}" && "${GIT_USER}" != "root" ]]; then
  sudo -u "${GIT_USER}" git pull --ff-only
else
  git pull --ff-only
fi

echo "==> Recriando containers"
docker compose up -d --build

echo
docker compose ps
echo
echo "Código atualizado. Containers: pastelaria-frontend, pastelaria-backend, pastelaria-db."
echo "Site na porta ${WEB_PORT}."
