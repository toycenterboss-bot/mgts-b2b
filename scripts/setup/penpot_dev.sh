#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/Users/andrey_efremov/Downloads/penpot-develop"

if [[ ! -d "$REPO_DIR" ]]; then
  echo "Penpot repo not found at: $REPO_DIR"
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

cd "$REPO_DIR"
echo "Starting Penpot dev environment..."
./manage.sh start-devenv

echo "Penpot dev URLs:"
echo "  http://localhost:3450"
echo "  https://localhost:3449 (self-signed cert)"
