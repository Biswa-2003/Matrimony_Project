#!/usr/bin/env bash
# Sends the weekly "new matches" email (run by cron every Sunday - see deploy/crontab.txt).
set -euo pipefail
cd "$(dirname "$0")/.."
CRON_SECRET=$(grep -E '^CRON_SECRET=' .env.production | cut -d= -f2-)
curl -fsS -m 300 -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/weekly-digest
echo
