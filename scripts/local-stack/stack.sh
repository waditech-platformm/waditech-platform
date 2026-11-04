#!/usr/bin/env bash
# Docker-free local Supabase-compatible stack:
#   PostgreSQL 16  (:54322)
#   Supabase Auth / GoTrue (:9999)   -> exposed at  http://127.0.0.1:54321/auth/v1
#   PostgREST      (:54330)          -> exposed at  http://127.0.0.1:54321/rest/v1
#   Mail catcher   (SMTP :54325)     -> captured mail at http://127.0.0.1:54321/__mail
#
# If you have Docker, `supabase start` (see supabase/config.toml) is the equivalent official path.
# Usage: scripts/local-stack/stack.sh setup|start|stop|reset|status
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LS="$ROOT/.local-stack"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="$LS/pgdata"
PGPORT=54322
RUN_AS="${PG_RUN_AS:-postgres}"
GOTRUE_VERSION="v2.177.0"
POSTGREST_VERSION="v12.2.3"
JWT_SECRET="${LOCAL_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"

as_pg() { if [ "$(id -u)" = "0" ]; then su "$RUN_AS" -s /bin/bash -c "$*"; else bash -c "$*"; fi; }

download() {
  mkdir -p "$LS/bin" "$LS/gotrue" "$LS/logs"
  if [ ! -x "$LS/bin/postgrest" ]; then
    curl -fsSL "https://github.com/PostgREST/postgrest/releases/download/$POSTGREST_VERSION/postgrest-$POSTGREST_VERSION-linux-static-x64.tar.xz" | tar -xJ -C "$LS/bin"
  fi
  if [ ! -x "$LS/gotrue/auth" ]; then
    curl -fsSL "https://github.com/supabase/auth/releases/download/$GOTRUE_VERSION/auth-$GOTRUE_VERSION-x86.tar.gz" | tar -xz -C "$LS/gotrue"
  fi
}

pg_start() {
  if as_pg "$PGBIN/pg_ctl -D $PGDATA status" >/dev/null 2>&1; then return; fi
  as_pg "$PGBIN/pg_ctl -D $PGDATA -l $LS/logs/postgres.log -o '-p $PGPORT -k /tmp' start -w"
}

setup() {
  download
  mkdir -p "$LS/logs"; chmod 777 "$LS" "$LS/logs"
  if [ ! -d "$PGDATA" ]; then
    mkdir -p "$PGDATA"; chown "$RUN_AS" "$PGDATA" 2>/dev/null || true
    as_pg "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust -E UTF8 --locale=C.UTF-8" >/dev/null
    echo "listen_addresses='127.0.0.1'" >> "$PGDATA/postgresql.conf"
  fi
  pg_start
  psql -h 127.0.0.1 -p $PGPORT -U postgres -tc "select 1 from pg_database where datname='waditech'" | grep -q 1 \
    || psql -h 127.0.0.1 -p $PGPORT -U postgres -c "create database waditech" >/dev/null
  psql -q -h 127.0.0.1 -p $PGPORT -U postgres -d waditech -v ON_ERROR_STOP=1 -f "$ROOT/scripts/local-stack/roles.sql"
  echo "setup complete"
}

start() {
  pg_start
  mkdir -p "$LS/logs"
  if ! pgrep -f "local-stack/gateway.mjs" >/dev/null; then
    nohup node "$ROOT/scripts/local-stack/gateway.mjs" > "$LS/logs/gateway.log" 2>&1 < /dev/null &
  fi
  if ! pgrep -f "$LS/gotrue/auth" >/dev/null; then
    (cd "$LS/gotrue" && env \
      GOTRUE_API_HOST=127.0.0.1 PORT=9999 API_EXTERNAL_URL="http://127.0.0.1:54321" \
      GOTRUE_DB_DRIVER=postgres DB_NAMESPACE=auth \
      GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:postgres@127.0.0.1:$PGPORT/waditech?search_path=auth" \
      GOTRUE_SITE_URL="${SITE_URL:-http://localhost:3000}" \
      GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**,http://127.0.0.1:3000/**" \
      GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated \
      GOTRUE_JWT_ADMIN_ROLES=service_role GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
      GOTRUE_DISABLE_SIGNUP=false GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=false \
      GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=54325 GOTRUE_SMTP_USER=dev GOTRUE_SMTP_PASS=dev \
      GOTRUE_SMTP_ADMIN_EMAIL="no-reply@waditech.local" GOTRUE_SMTP_SENDER_NAME="WadiTech Academy (DEV)" \
      GOTRUE_MAILER_URLPATHS_CONFIRMATION="/auth/v1/verify" GOTRUE_MAILER_URLPATHS_RECOVERY="/auth/v1/verify" \
      GOTRUE_MAILER_TEMPLATES_CONFIRMATION="http://127.0.0.1:54321/__templates/confirmation.html" \
      GOTRUE_MAILER_TEMPLATES_RECOVERY="http://127.0.0.1:54321/__templates/recovery.html" \
      GOTRUE_MAILER_SUBJECTS_CONFIRMATION="Confirm your WadiTech Academy account" \
      GOTRUE_MAILER_SUBJECTS_RECOVERY="Reset your WadiTech Academy password" \
      GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true \
      GOTRUE_PASSWORD_MIN_LENGTH=8 GOTRUE_LOG_LEVEL=warn \
      nohup ./auth > "$LS/logs/gotrue.log" 2>&1 < /dev/null &)
  fi
  if ! pgrep -f "$LS/bin/postgrest" >/dev/null; then
    env PGRST_DB_URI="postgres://authenticator:postgres@127.0.0.1:$PGPORT/waditech" \
      PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon PGRST_JWT_SECRET="$JWT_SECRET" \
      PGRST_DB_EXTRA_SEARCH_PATH="public,extensions" PGRST_SERVER_PORT=54330 PGRST_SERVER_HOST=127.0.0.1 \
      PGRST_DB_CHANNEL_ENABLED=true PGRST_LOG_LEVEL=warn \
      nohup "$LS/bin/postgrest" > "$LS/logs/postgrest.log" 2>&1 < /dev/null &
  fi
  for i in $(seq 1 40); do
    if curl -fs http://127.0.0.1:9999/health >/dev/null 2>&1 && curl -fs http://127.0.0.1:54321/__health >/dev/null 2>&1; then echo "stack up"; return; fi
    sleep 0.5
  done
  echo "stack did not become healthy; see $LS/logs" >&2; exit 1
}

stop() {
  pkill -f "$LS/gotrue/auth" || true
  pkill -f "$LS/bin/postgrest" || true
  pkill -f "local-stack/gateway.mjs" || true
  as_pg "$PGBIN/pg_ctl -D $PGDATA stop -m fast" >/dev/null 2>&1 || true
}

reload_schema() { psql -q -h 127.0.0.1 -p $PGPORT -U postgres -d waditech -c "notify pgrst, 'reload schema'"; }

case "${1:-}" in
  setup) setup ;;
  start) start ;;
  stop) stop ;;
  reload) reload_schema ;;
  reset) stop; rm -rf "$PGDATA"; setup; start ;;
  status) pgrep -fa "gotrue/auth|bin/postgrest|gateway.mjs|postgres -D" || true ;;
  *) echo "usage: $0 setup|start|stop|reset|status|reload"; exit 1 ;;
esac
