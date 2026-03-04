#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="${ROOT}/.dev"

STATIC_PORT="${STATIC_PORT:-8002}"
STRAPI_PORT="${STRAPI_PORT:-1337}"

pid_listen() {
  local port="$1"
  lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
}

kill_pidfile() {
  local name="$1"
  local pidfile="${RUNTIME_DIR}/${name}.pid"
  if [[ -f "${pidfile}" ]]; then
    local pid
    pid="$(cat "${pidfile}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]]; then
      kill "${pid}" 2>/dev/null || true
      # give it a moment; force if needed
      sleep 1
      kill -9 "${pid}" 2>/dev/null || true
    fi
    rm -f "${pidfile}" || true
  fi
}

echo "⏹️  Stopping services..."
kill_pidfile "strapi"
kill_pidfile "static"

for pid in $(pid_listen "${STRAPI_PORT}"); do
  kill -9 "${pid}" 2>/dev/null || true
done
for pid in $(pid_listen "${STATIC_PORT}"); do
  kill -9 "${pid}" 2>/dev/null || true
done

echo "✅ Stopped (ports :${STRAPI_PORT}, :${STATIC_PORT})"
