#!/bin/sh
set -e

# Only create the database when using local Postgres (no DATABASE_URL injected by PaaS)
if [ -z "$DATABASE_URL" ]; then
  python - <<'EOF'
import psycopg2
import os

host     = os.environ.get("POSTGRES_HOST", "postgres")
port     = os.environ.get("POSTGRES_PORT", "5432")
user     = os.environ.get("POSTGRES_USER", "postgres")
password = os.environ.get("POSTGRES_PASSWORD", "postgres")
db_name  = os.environ.get("POSTGRES_DB", "revalue")

conn = psycopg2.connect(host=host, port=port, user=user, password=password, dbname="postgres")
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
if not cur.fetchone():
    cur.execute(f'CREATE DATABASE "{db_name}"')
    print(f"Created database: {db_name}")
else:
    print(f"Database already exists: {db_name}")
cur.close()
conn.close()
EOF
fi

# Wait for Postgres to be ready to accept connections (healthcheck passes TCP
# before Postgres is fully ready for queries)
echo "Waiting for database to accept connections..."
for i in $(seq 1 15); do
  python - <<'EOF' && break
import psycopg2, os, sys
try:
    conn = psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "postgres"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
        user=os.environ.get("POSTGRES_USER", "postgres"),
        password=os.environ.get("POSTGRES_PASSWORD", "postgres"),
        dbname=os.environ.get("POSTGRES_DB", "revalue"),
        connect_timeout=3,
    )
    conn.close()
    print("Database ready.")
    sys.exit(0)
except Exception as e:
    print(f"Not ready: {e}")
    sys.exit(1)
EOF
  echo "Retry $i/15 — waiting 2s..."
  sleep 2
done

# Apply all pending migrations
alembic upgrade head

# Start the application — 4 workers for concurrency
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
