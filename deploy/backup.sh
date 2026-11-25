#!/usr/bin/env bash
# Daily database backup (run by cron - see deploy/crontab.txt). Keeps the last BACKUP_KEEP dumps.
set -euo pipefail
cd "$(dirname "$0")/.."
node --env-file=.env.production scripts/backup-db.mjs
