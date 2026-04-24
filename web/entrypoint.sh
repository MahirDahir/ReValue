#!/bin/sh
# Replace the listen port with Railway's $PORT (falls back to 80 for local Docker Compose)
PORT="${PORT:-80}"
sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
