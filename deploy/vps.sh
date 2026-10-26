#!/usr/bin/env bash
# Remove os containers da Pastelaria e sobe a implantação nova:
# pastelaria-frontend, pastelaria-backend (Python) e pastelaria-db.
# O volume do Postgres é mantido.
#
# No servidor, na pasta do projeto, com o .env ao lado do docker-compose.yml:
#   sudo bash deploy/vps.sh

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash deploy/vps.sh" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose não está disponível." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_DIR}"

if [[ ! -f .env ]]; then
  echo "Arquivo .env ausente na raiz do projeto." >&2
  exit 1
fi

if [[ ! -f data/products.json ]]; then
  echo "Arquivo data/products.json ausente." >&2
  exit 1
fi

# O Nginx do sistema, se tiver ficado da instalação antiga, ocupa a porta 80.
if systemctl is-active --quiet nginx 2>/dev/null; then
  echo "==> Parando o Nginx do sistema"
  systemctl stop nginx
  systemctl disable nginx
fi

echo "==> Removendo containers atuais"
docker compose down --remove-orphans
docker rm -f pastelaria-frontend pastelaria-backend pastelaria-db >/dev/null 2>&1 || true

echo "==> Construindo e subindo a implantação nova"
docker compose up -d --build --force-recreate --remove-orphans

WEB_PORT="$(grep -E '^WEB_PORT=' .env | cut -d= -f2- | tr -d '"' || true)"
WEB_PORT="${WEB_PORT:-80}"

echo "==> Conferindo a API Python"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null; then
    break
  fi
  sleep 2
done

curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health"
echo
curl -fsS "http://127.0.0.1:${WEB_PORT}/api/products" >/dev/null
echo
docker compose ps
echo
echo "Rotas /api e /uploads vão para o backend Python."
echo "Site na porta ${WEB_PORT}."
