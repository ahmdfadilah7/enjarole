#!/usr/bin/env bash
# Setup awal VPS Hostinger (Ubuntu 22.04/24.04) — jalankan sekali sebagai root atau dengan sudo
set -euo pipefail

echo "==> Update sistem..."
apt-get update && apt-get upgrade -y

echo "==> Install dependensi..."
apt-get install -y ca-certificates curl git ufw

echo "==> Install Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Aktifkan firewall (SSH + HTTP + HTTPS)..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Buat folder ACME webroot..."
mkdir -p deploy/certbot/www

echo ""
echo "Setup selesai. Langkah berikutnya:"
echo "  1. Clone repo ke server"
echo "  2. cp deploy/.env.production.example .env.production && nano .env.production"
echo "  3. cp deploy/nginx/enjarole.http.conf deploy/nginx/enjarole.conf"
echo "  4. bash deploy/scripts/deploy.sh"
echo "  5. Pasang SSL (lihat docs/DEPLOYMENT.md)"
