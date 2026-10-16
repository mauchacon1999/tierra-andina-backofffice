#!/bin/sh
# Crea la base de test junto a la principal. Solo se ejecuta al inicializar un volumen vacío.
set -eu

TEST_DB="${POSTGRES_DB}_test"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE "${TEST_DB}" OWNER "${POSTGRES_USER}";
EOSQL

echo "Base de test creada: ${TEST_DB}"
