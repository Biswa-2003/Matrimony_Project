#!/usr/bin/env bash
# Deploy the latest code. Run on the server from the project folder:
#   cd /var/www/matrimoney && bash deploy/deploy.sh
# It pulls the code, installs packages, builds, updates the database tables, and restarts the app.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo "Missing .env.production - copy deploy/env.production.example to .env.production and fill it in." >&2
  exit 1
fi

echo "==> Getting the latest code"
git pull --ff-only

echo "==> Installing packages"
npm ci --no-audit --no-fund

echo "==> Building (takes a few minutes)"
NEXT_TELEMETRY_DISABLED=1 npm run build

echo "==> Copying public files and build assets into the standalone app"
rm -rf .next/standalone/public .next/standalone/.next/static
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo "==> Updating database tables (safe to repeat)"
node --env-file=.env.production scripts/migrate.mjs

echo "==> Restarting the app"
if pm2 describe matrimoney >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save >/dev/null

echo "==> Checking the app answers"
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)
  if [ "$code" = "200" ]; then
    echo "    OK - the app is running (HTTP 200)."
    exit 0
  fi
  sleep 2
done
echo "    The app did not answer with 200 (last: $code). Check: pm2 logs matrimoney --lines 50" >&2
exit 1
