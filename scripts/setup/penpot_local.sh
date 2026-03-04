#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/andrey_efremov/Downloads/runs"
PENPOT_DIR="$ROOT_DIR/tools/penpot"
COMPOSE_FILE="$PENPOT_DIR/docker-compose.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing compose file: $COMPOSE_FILE"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "Installing colima + docker via brew..."
    brew install colima docker docker-compose
  else
    echo "Homebrew not found. Install Homebrew, then rerun this script."
    exit 1
  fi
fi

if command -v colima >/dev/null 2>&1; then
  echo "Starting Colima..."
  colima start --cpu 4 --memory 6 --disk 30
fi

echo "Starting Penpot..."
docker compose -f "$COMPOSE_FILE" up -d

echo "Penpot is starting at http://localhost:9001"
