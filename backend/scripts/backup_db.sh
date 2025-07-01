#!/bin/bash

# Load environment variables from .env if present
if [ -f "../.env" ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

# Use DATABASE_URL from environment or .env
DB_URL=${DATABASE_URL:-""}
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +"%Y%m%d_%H%M%S")

if [[ $DB_URL == postgresql* ]]; then
  # Parse out components
  PGUSER=$(echo $DB_URL | sed -E 's|.*//([^:]+):.*|\1|')
  PGPASSWORD=$(echo $DB_URL | sed -E 's|.*:([^@]+)@.*|\1|')
  PGHOST=$(echo $DB_URL | sed -E 's|.*@([^:/]+).*|\1|')
  PGPORT=$(echo $DB_URL | sed -E 's|.*:([0-9]+)/.*|\1|')
  PGDATABASE=$(echo $DB_URL | sed -E 's|.*/([^?]+).*|\1|')
  export PGPASSWORD
  FILENAME="$BACKUP_DIR/pg_backup_$DATE.sql"
  echo "Backing up PostgreSQL DB to $FILENAME"
  pg_dump -h "$PGHOST" -U "$PGUSER" -p "$PGPORT" -F c -b -v -f "$FILENAME" "$PGDATABASE"
  unset PGPASSWORD
elif [[ $DB_URL == sqlite* ]]; then
  SQLITE_FILE=$(echo $DB_URL | sed -E 's|sqlite:///||')
  FILENAME="$BACKUP_DIR/sqlite_backup_$DATE.db"
  echo "Backing up SQLite DB to $FILENAME"
  cp "$SQLITE_FILE" "$FILENAME"
else
  echo "Unsupported or missing DATABASE_URL: $DB_URL"
  exit 1
fi

echo "Backup complete." 