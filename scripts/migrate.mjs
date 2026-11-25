/**
 * Idempotent database migration — safe to run any number of times.
 *
 *   npm run db:migrate                 (uses DATABASE_URL / DB_* from .env.local or the environment)
 *
 * Adds missing performance indexes and the tables used by shortlist, block/report moderation,
 * payments and contact enquiries. Nothing is dropped or rewritten.
 */
import fs from "node:fs";
import pg from "pg";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.DATABASE_URL;
const isLocal = (url || process.env.DB_HOST || "").match(/localhost|127\.0\.0\.1/);
const pool = new pg.Pool(
  url
    ? { connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME, port: process.env.DB_PORT || 5432, ssl: isLocal ? false : { rejectUnauthorized: false },
      }
);

const STEPS = [
  // --- new feature tables -------------------------------------------------
  [`shortlists table`, `CREATE TABLE IF NOT EXISTS shortlists (
      user_id uuid NOT NULL, target_user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(), PRIMARY KEY (user_id, target_user_id))`],
  // blocks / reports reference matrimony_profiles.id (profile ids)
  [`blocks table`, `CREATE TABLE IF NOT EXISTS blocks (blocker_id uuid NOT NULL REFERENCES matrimony_profiles(id) ON DELETE CASCADE, blocked_id uuid NOT NULL REFERENCES matrimony_profiles(id) ON DELETE CASCADE, created_at timestamptz DEFAULT NOW(), PRIMARY KEY (blocker_id, blocked_id))`],
  [`blocks reverse lookup`, `CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks (blocked_id)`],
  [`reports table`, `CREATE TABLE IF NOT EXISTS reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid REFERENCES matrimony_profiles(id) ON DELETE CASCADE, reported_id uuid REFERENCES matrimony_profiles(id) ON DELETE CASCADE, reason text, details text, created_at timestamptz DEFAULT NOW())`],
  [`reports.status`, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'`],
  [`reports.resolved_at`, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz`],
  [`reports.admin_note`, `ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_note text`],
  [`reports queue index`, `CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports (status, created_at DESC)`],
  [`reports by member`, `CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports (reported_id)`],
  [`payments table`, `CREATE TABLE IF NOT EXISTS payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, plan_id smallint NOT NULL,
      provider text NOT NULL DEFAULT 'razorpay', order_id text UNIQUE, payment_id text,
      amount_paise integer NOT NULL, currency text NOT NULL DEFAULT 'INR', status text NOT NULL DEFAULT 'created',
      created_at timestamptz NOT NULL DEFAULT NOW(), paid_at timestamptz)`],
  [`payments by user`, `CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id, created_at DESC)`],
  [`contact_messages table`, `CREATE TABLE IF NOT EXISTS contact_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL, mobile text,
      subject text, message text NOT NULL, status text NOT NULL DEFAULT 'new', created_at timestamptz NOT NULL DEFAULT NOW())`],

  [`notification read state`, `ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_seen_at timestamptz`],
  [`saved_searches table`, `CREATE TABLE IF NOT EXISTS saved_searches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL,
      params jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW())`],
  [`saved searches by user`, `CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches (user_id, created_at DESC)`],

  [`media_files table (site images stored in DB)`, `CREATE TABLE IF NOT EXISTS media_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_type text NOT NULL, data bytea NOT NULL,
      size_bytes integer NOT NULL, original_name text, created_at timestamptz NOT NULL DEFAULT NOW())`],
  [`site_settings table`, `CREATE TABLE IF NOT EXISTS site_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT NOW())`],

  // --- performance indexes for hot queries --------------------------------
  [`photos by profile (used by every profile/match card)`, `CREATE INDEX IF NOT EXISTS idx_photos_profile ON photos (profile_id, is_primary DESC, created_at DESC)`],
  [`active subscription lookup`, `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_ends ON subscriptions (user_id, ends_at DESC)`],
  [`profiles I viewed`, `CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_time ON profile_views (viewer_id, viewed_at DESC)`],
  [`received interests by status`, `CREATE INDEX IF NOT EXISTS idx_interests_to_status ON interests (to_profile, status)`],
  [`match list filter (gender + active)`, `CREATE INDEX IF NOT EXISTS idx_mp_gender_active ON matrimony_profiles (gender, is_active)`],
  [`success stories listing`, `CREATE INDEX IF NOT EXISTS idx_success_stories_approved ON success_stories (is_approved, created_at DESC)`],
];

let failed = 0;
for (const [label, sql] of STEPS) {
  try {
    await pool.query(sql);
    console.log(`  ✓ ${label}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${label}: ${e.message}`);
  }
}
await pool.query("ANALYZE").catch(() => {});
await pool.end();
console.log(failed ? `\nDone with ${failed} warning(s).` : "\nMigration complete.");
process.exit(failed ? 1 : 0);
