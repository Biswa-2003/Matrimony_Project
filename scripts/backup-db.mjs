// Database backup: `npm run db:backup`
// Writes a compressed pg_dump (custom format) to ./backups/matrimoney-YYYY-MM-DD_HHMM.dump and keeps the last 14.
// Restore with:  pg_restore --clean --if-exists -d "<DATABASE_URL>" backups/<file>.dump
//
// Uses DATABASE_URL if set, otherwise DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME from .env.local.
// Needs pg_dump on PATH (installed with PostgreSQL; on Windows usually C:\Program Files\PostgreSQL\<ver>\bin).
// Schedule it daily with Windows Task Scheduler / cron. On Neon, also keep point-in-time restore enabled.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const KEEP = Number(process.env.BACKUP_KEEP || 14);
const dir = path.resolve(process.env.BACKUP_DIR || "backups");
fs.mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16).replace(/-(\d\d)-(\d\d)$/, "_$1$2");
const file = path.join(dir, `matrimoney-${stamp}.dump`);

const env = { ...process.env };
const args = ["--format=custom", "--no-owner", "--no-privileges", "--file", file];
if (process.env.DATABASE_URL && process.env.USE_LOCAL_DB !== "true") {
  args.push(process.env.DATABASE_URL);
} else {
  args.push("-h", process.env.DB_HOST || "localhost", "-p", String(process.env.DB_PORT || 5432), "-U", process.env.DB_USER || "postgres", process.env.DB_NAME || "postgres");
  env.PGPASSWORD = process.env.DB_PASSWORD || "";
}

const bin = process.env.PG_DUMP || "pg_dump";
console.log(`Backing up to ${file} …`);
const child = spawn(bin, args, { env, stdio: ["ignore", "inherit", "inherit"] });
child.on("error", (e) => {
  console.error(`Could not run ${bin}: ${e.message}. Add PostgreSQL's bin folder to PATH or set PG_DUMP to the full path.`);
  process.exit(1);
});
child.on("exit", (code) => {
  if (code !== 0) {
    console.error(`pg_dump failed (exit ${code}).`);
    try { fs.unlinkSync(file); } catch {}
    process.exit(code || 1);
  }
  const size = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
  console.log(`✓ Backup complete (${size} MB)`);
  const old = fs.readdirSync(dir).filter((f) => /^matrimoney-.*\.dump$/.test(f)).sort().reverse().slice(KEEP);
  for (const f of old) fs.unlinkSync(path.join(dir, f));
  if (old.length) console.log(`Removed ${old.length} old backup(s); keeping the latest ${KEEP}.`);
});
