#!/bin/sh
# Creates the test database next to the main one. Only runs when an empty volume is initialized.
set -eu

TEST_DB="${POSTGRES_DB}_test"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE "${TEST_DB}" OWNER "${POSTGRES_USER}";
EOSQL

echo "Test database created: ${TEST_DB}"
