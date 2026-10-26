#!/bin/sh
# Sobe o Postgres e aplica a senha do .env sem apagar o volume.
set -eu

docker-entrypoint.sh postgres &
pid=$!

until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  sleep 1
done

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v db_user="$POSTGRES_USER" \
  -v db_password="$POSTGRES_PASSWORD" <<'SQL'
ALTER USER :"db_user" PASSWORD :'db_password';
SQL

trap 'kill "$pid"' TERM INT
wait "$pid"
