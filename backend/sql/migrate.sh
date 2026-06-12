#!/bin/bash
# Jalankan semua migration SQL secara berurutan
# Usage: ./sql/migrate.sh [mysql_user] [mysql_password]
# Contoh: ./sql/migrate.sh root
# Contoh: ./sql/migrate.sh root mypassword

USER="${1:-root}"
PASS="${2:-}"
DIR="$(cd "$(dirname "$0")/migrations" && pwd)"

MYSQL_CMD="mysql -u $USER"
if [ -n "$PASS" ]; then
  MYSQL_CMD="mysql -u $USER -p$PASS"
fi

echo "Running migrations..."

for file in "$DIR"/000_create_database.sql "$DIR"/001_initial_schema.sql "$DIR"/002_add_settings_table.sql "$DIR"/003_add_topup_requests_and_admin_wa.sql; do
  if [ -f "$file" ]; then
    echo "-> $(basename "$file")"
    $MYSQL_CMD < "$file"
    if [ $? -ne 0 ]; then
      echo "Migration failed: $file"
      exit 1
    fi
  fi
done

echo "All migrations completed."
