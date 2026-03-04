#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="${ROOT}/.dev"
STRAPI_DIR="${ROOT}/mgts-backend"

STATIC_PORT="${STATIC_PORT:-8002}"
STRAPI_PORT="${STRAPI_PORT:-1337}"

mkdir -p "${RUNTIME_DIR}"

pid_listen() {
  local port="$1"
  lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
}

start_static() {
  if [[ -n "$(pid_listen "${STATIC_PORT}")" ]]; then
    echo "ℹ️  Static server already listening on :${STATIC_PORT}"
    return 0
  fi

  echo "🚀 Starting static server (design/) on :${STATIC_PORT}"
  nohup python3 "${ROOT}/scripts/dev/static_server.py" --port "${STATIC_PORT}" --directory "${ROOT}/design" \
    > "${RUNTIME_DIR}/static.log" 2>&1 &
  echo $! > "${RUNTIME_DIR}/static.pid"
}

start_strapi() {
  if [[ -n "$(pid_listen "${STRAPI_PORT}")" ]]; then
    echo "ℹ️  Strapi already listening on :${STRAPI_PORT}"
    return 0
  fi

  echo "🚀 Starting Strapi (mgts-backend) on :${STRAPI_PORT}"
  (
    cd "${STRAPI_DIR}"
    nohup npm run develop > "${RUNTIME_DIR}/strapi.log" 2>&1 &
    echo $! > "${RUNTIME_DIR}/strapi.pid"
  )
}

start_static
start_strapi

echo ""
echo "✅ Started"
echo "- Strapi:  http://localhost:${STRAPI_PORT}/admin"
echo "- Site:    http://localhost:${STATIC_PORT}/html_pages/"
echo "- Logs:    ${RUNTIME_DIR}/strapi.log  ${RUNTIME_DIR}/static.log"
echo ""
