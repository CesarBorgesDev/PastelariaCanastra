#!/usr/bin/env bash
# Busca o código no GitHub e reinicia os containers com a versão nova.
# O volume do Postgres e a pasta data/uploads são mantidos.
#
# Na pasta do projeto, com o .env ao lado do docker-compose.yml:
#   bash deploy/atualizar.sh

set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "Git não está disponível." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose não está disponível." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_DIR}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Esta pasta não é um repositório Git." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Arquivo .env ausente na raiz do projeto." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Há alterações locais. Faça commit ou descarte antes de atualizar." >&2
  git status --short >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${BRANCH}" == "HEAD" ]]; then
  echo "O repositório está em detached HEAD. Faça checkout de uma branch antes." >&2
  exit 1
fi

echo "==> Buscando origin/${BRANCH}"
git fetch origin
git pull --ff-only origin "${BRANCH}"

echo "==> Reconstruindo e reiniciando os containers"
docker compose up -d --build --force-recreate --remove-orphans

WEB_PORT="$(grep -E '^WEB_PORT=' .env | cut -d= -f2- | tr -d '"' || true)"
WEB_PORT="${WEB_PORT:-80}"

echo "==> Conferindo a API"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null; then
    break
  fi
  sleep 2
done

curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health"
echo
docker compose ps
echo
echo "Código de origin/${BRANCH} em execução na porta ${WEB_PORT}."
