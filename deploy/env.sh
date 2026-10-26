#!/usr/bin/env bash
# Carrega deploy/vps.env e grava as variáveis que o Docker Compose lê.

urlencode() {
  local value="$1"
  local i char encoded=""
  LC_ALL=C
  for ((i = 0; i < ${#value}; i++)); do
    char="${value:i:1}"
    case "${char}" in
      [a-zA-Z0-9._~-]) encoded+="${char}" ;;
      *) printf -v char '%%%02X' "'${char}"
         encoded+="${char}" ;;
    esac
  done
  printf '%s' "${encoded}"
}

escape_env() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '%s' "${value}"
}

load_pastelaria_env() {
  local script_dir="$1"
  local repo_dir="$2"
  local env_file="${script_dir}/vps.env"

  if [[ -f "${env_file}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${env_file}"
    set +a
  fi

  unset DATABASE_URL
  export WEB_PORT="${WEB_PORT:-80}"
  export POSTGRES_USER="${POSTGRES_USER:-pastelaria}"
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-pastelaria}"
  export POSTGRES_DB="${POSTGRES_DB:-pastelaria}"
  export POSTGRES_PASSWORD_URL
  POSTGRES_PASSWORD_URL="$(urlencode "${POSTGRES_PASSWORD}")"

  umask 077
  {
    printf 'WEB_PORT="%s"\n' "$(escape_env "${WEB_PORT}")"
    printf 'POSTGRES_USER="%s"\n' "$(escape_env "${POSTGRES_USER}")"
    printf 'POSTGRES_PASSWORD="%s"\n' "$(escape_env "${POSTGRES_PASSWORD}")"
    printf 'POSTGRES_DB="%s"\n' "$(escape_env "${POSTGRES_DB}")"
    printf 'POSTGRES_PASSWORD_URL="%s"\n' "$(escape_env "${POSTGRES_PASSWORD_URL}")"
  } > "${repo_dir}/.env"
}
