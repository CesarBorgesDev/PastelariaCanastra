#!/bin/sh
# Roda dentro do container pastelaria-db, pela conexão local, sem senha.
set -eu
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v db_user="$POSTGRES_USER" \
  -v db_password="$POSTGRES_PASSWORD" <<'SQL'
ALTER USER :"db_user" PASSWORD :'db_password';
SQL
