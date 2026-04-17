#!/bin/sh
set -e

# Ensure the application database exists (idempotent — safe to run on every start)
python - <<'EOF'
import psycopg2
import os, sys

host = os.environ.get("POSTGRES_HOST", "postgres")
port = os.environ.get("POSTGRES_PORT", "5432")
user = os.environ.get("POSTGRES_USER", "postgres")
password = os.environ.get("POSTGRES_PASSWORD", "postgres")
db_name = os.environ.get("POSTGRES_DB", "revalue")

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

# Apply all pending migrations
alembic upgrade head

# Start the application
exec uvicorn main:app --host 0.0.0.0 --port 8000
