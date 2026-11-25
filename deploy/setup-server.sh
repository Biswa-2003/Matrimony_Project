#!/usr/bin/env bash
# One-time setup for a fresh Lightsail Ubuntu 24.04 server.
# Installs: swap, Node.js 22, PM2, Nginx, PostgreSQL 16, Certbot, git.
# Creates the database "matrimoney" and its user, and prints the DATABASE_URL to put in .env.production.
#
# Run on the server as the default "ubuntu" user:
#   bash setup-server.sh
set -euo pipefail

APP_DIR=/var/www/matrimoney
DB_NAME=matrimoney
DB_USER=matrimoney

echo "==> Updating Ubuntu"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "==> Adding 2 GB swap (next build needs more memory than a small server has)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Installing Node.js 22"
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Installing git, Nginx, PostgreSQL, Certbot"
sudo apt-get install -y git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

echo "==> Installing PM2"
sudo npm install -g pm2

echo "==> Creating the database"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  echo "    Database user '${DB_USER}' already exists - keeping its password."
  DB_PASS="<the password you saved the first time>"
else
  DB_PASS=$(openssl rand -hex 24)
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null

echo "==> Preparing ${APP_DIR}"
sudo mkdir -p "${APP_DIR}" /var/backups/matrimoney
sudo chown -R "$USER":"$USER" "${APP_DIR}" /var/backups/matrimoney

echo "==> Making PM2 start on reboot"
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

echo
echo "================================================================"
echo " Setup finished."
echo " Node: $(node -v)   PostgreSQL: $(psql --version | awk '{print $3}')"
echo
echo " SAVE THIS - put it in .env.production as DATABASE_URL:"
echo "   DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo "================================================================"
