#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.production ]]; then
  echo "File .env.production tidak ditemukan."
  echo "Salin template: cp deploy/.env.production.example .env.production"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.production
set +a

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "==> Build & start containers..."
$COMPOSE build --pull
$COMPOSE up -d

echo "==> Status:"
$COMPOSE ps

echo ""
echo "Deploy selesai. Buka: https://${DOMAIN:-enjarole.hachiedigitation.com}"
echo "API docs: https://${DOMAIN:-enjarole.hachiedigitation.com}/api/docs"
