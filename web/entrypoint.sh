#!/bin/sh
# Replace the listen port with Railway's $PORT (falls back to 80 for local Docker Compose)
PORT="${PORT:-80}"
sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/conf.d/default.conf

# Replace BACKEND_HOST placeholder:
# - In Docker Compose: BACKEND_HOST=backend (Docker internal hostname)
# - On Railway/PaaS: BACKEND_HOST=localhost (proxy block unused — VITE_API_URL hits backend directly)
BACKEND_HOST="${BACKEND_HOST:-localhost}"
sed -i "s/BACKEND_HOST/${BACKEND_HOST}/g" /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
