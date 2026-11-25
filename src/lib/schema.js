import { query } from "@/lib/db";

/**
 * Idempotent, additive schema for features added in the Nov-2026 update
 * (shortlists, payments, contact messages, report moderation).
 * Runs once per server process the first time a feature needs it, so a deploy can never
 * break because a migration was forgotten. Heavier index work lives in scripts/migrate.mjs.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS shortlists (
     user_id uuid NOT NULL,
     target_user_id uuid NOT NULL,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     PRIMARY KEY (user_id, target_user_id)
   )`,
  // blocks / reports reference matrimony_profiles.id (profile ids), as in the existing schema
  `CREATE TABLE IF NOT EXISTS blocks (
     blocker_id uuid NOT NULL REFERENCES matrimony_profiles(id) ON DELETE CASCADE,
     blocked_id uuid NOT NULL REFERENCES matrimony_profiles(id) ON DELETE CASCADE,
     created_at timestamptz DEFAULT NOW(),
     PRIMARY KEY (blocker_id, blocked_id)
   )`,
  `CREATE TABLE IF NOT EXISTS reports (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     reporter_id uuid REFERENCES matrimony_profiles(id) ON DELETE CASCADE,
     reported_id uuid REFERENCES matrimony_profiles(id) ON DELETE CASCADE,
     reason text,
     details text,
     created_at timestamptz DEFAULT NOW()
   )`,
  `ALTER TABLE reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'`,
  `ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz`,
  `ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_note text`,
  `CREATE TABLE IF NOT EXISTS payments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL,
     plan_id smallint NOT NULL,
     provider text NOT NULL DEFAULT 'razorpay',
     order_id text UNIQUE,
     payment_id text,
     amount_paise integer NOT NULL,
     currency text NOT NULL DEFAULT 'INR',
     status text NOT NULL DEFAULT 'created',
     created_at timestamptz NOT NULL DEFAULT NOW(),
     paid_at timestamptz
   )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_seen_at timestamptz`,
  `CREATE TABLE IF NOT EXISTS saved_searches (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL,
     name text NOT NULL,
     params jsonb NOT NULL,
     created_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches (user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS media_files (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     content_type text NOT NULL,
     data bytea NOT NULL,
     size_bytes integer NOT NULL,
     original_name text,
     created_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS site_settings (
     key text PRIMARY KEY,
     value jsonb NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS contact_messages (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     email text NOT NULL,
     mobile text,
     subject text,
     message text NOT NULL,
     status text NOT NULL DEFAULT 'new',
     created_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  // ---------------- member-to-member chat ----------------
  // user_a < user_b (USER ids) so a pair has exactly one conversation
  `CREATE TABLE IF NOT EXISTS conversations (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_a uuid NOT NULL,
     user_b uuid NOT NULL,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     last_message_at timestamptz,
     CONSTRAINT conversations_pair UNIQUE (user_a, user_b),
     CONSTRAINT conversations_order CHECK (user_a < user_b)
   )`,
  `CREATE TABLE IF NOT EXISTS messages (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
     sender_id uuid NOT NULL,
     body text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     read_at timestamptz,
     flagged boolean NOT NULL DEFAULT false,
     flag_reason text,
     deleted_at timestamptz
   )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (conversation_id, sender_id) WHERE read_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_a ON conversations (user_a, last_message_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_b ON conversations (user_b, last_message_at DESC)`,

  // ---------------- notification preferences + email log ----------------
  `CREATE TABLE IF NOT EXISTS user_preferences (
     user_id uuid PRIMARY KEY,
     alert_email boolean NOT NULL DEFAULT true,
     alert_sms boolean NOT NULL DEFAULT false,
     updated_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_messages boolean NOT NULL DEFAULT true`,
  `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_digest boolean NOT NULL DEFAULT true`,
  `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS lang text`,
  // one row per email sent — used to throttle (e.g. at most one "new message" mail per chat per 6h)
  `CREATE TABLE IF NOT EXISTS email_log (
     id bigserial PRIMARY KEY,
     user_id uuid NOT NULL,
     kind text NOT NULL,
     ref text,
     sent_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_email_log_lookup ON email_log (user_id, kind, ref, sent_at DESC)`,

  // ---------------- login sessions (device list, remote logout) ----------------
  `CREATE TABLE IF NOT EXISTS user_sessions (
     id uuid PRIMARY KEY,
     user_id uuid NOT NULL,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     last_seen_at timestamptz NOT NULL DEFAULT NOW(),
     ip text,
     user_agent text,
     revoked_at timestamptz
   )`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id, last_seen_at DESC)`,
  // "log out everywhere": tokens issued before this instant are rejected
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz`,

  // ---------------- member photos in the DB + photo requests ----------------
  `ALTER TABLE photos ADD COLUMN IF NOT EXISTS media_id uuid`,
  `CREATE TABLE IF NOT EXISTS photo_requests (
     requester_id uuid NOT NULL,
     owner_id uuid NOT NULL,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     status text NOT NULL DEFAULT 'pending',
     answered_at timestamptz,
     PRIMARY KEY (requester_id, owner_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_photo_requests_owner ON photo_requests (owner_id, status, created_at DESC)`,

  // ---------------- moderation ----------------
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_reason text`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS reviewed_at timestamptz`,
  `CREATE TABLE IF NOT EXISTS content_flags (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL,
     field text NOT NULL,
     excerpt text,
     reasons text[] NOT NULL DEFAULT '{}',
     status text NOT NULL DEFAULT 'open',
     created_at timestamptz NOT NULL DEFAULT NOW(),
     reviewed_at timestamptz,
     CONSTRAINT content_flags_one_per_field UNIQUE (user_id, field)
   )`,
  `CREATE TABLE IF NOT EXISTS member_warnings (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL,
     reason text NOT NULL,
     created_by uuid,
     created_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS admin_audit (
     id bigserial PRIMARY KEY,
     admin_id uuid,
     action text NOT NULL,
     target_user_id uuid,
     details jsonb,
     created_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_audit_time ON admin_audit (created_at DESC)`,

  // ---------------- contact unlocks (plan credits) ----------------
  `CREATE TABLE IF NOT EXISTS contact_unlocks (
     viewer_id uuid NOT NULL,
     target_id uuid NOT NULL,
     subscription_id uuid,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     PRIMARY KEY (viewer_id, target_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_contact_unlocks_target ON contact_unlocks (target_id, created_at DESC)`,

  // ---------------- error monitoring ----------------
  `CREATE TABLE IF NOT EXISTS app_errors (
     id bigserial PRIMARY KEY,
     source text NOT NULL,
     message text NOT NULL,
     path text,
     digest text,
     created_at timestamptz NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_app_errors_time ON app_errors (created_at DESC)`,

  // ---------------- coupons ----------------
  `CREATE TABLE IF NOT EXISTS coupons (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     code text NOT NULL UNIQUE,
     description text,
     kind text NOT NULL DEFAULT 'percent',
     value numeric NOT NULL,
     max_discount_inr numeric,
     plan_codes text[],
     max_uses integer,
     used_count integer NOT NULL DEFAULT 0,
     valid_from timestamptz,
     valid_until timestamptz,
     active boolean NOT NULL DEFAULT true,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     CONSTRAINT coupons_kind CHECK (kind IN ('percent', 'flat')),
     CONSTRAINT coupons_value CHECK (value > 0)
   )`,
  `CREATE TABLE IF NOT EXISTS coupon_redemptions (
     coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
     user_id uuid NOT NULL,
     discount_paise integer NOT NULL DEFAULT 0,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     PRIMARY KEY (coupon_id, user_id)
   )`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_id uuid`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_paise integer NOT NULL DEFAULT 0`,

  // ---------------- referrals ----------------
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code) WHERE referral_code IS NOT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_days integer NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS referrals (
     referee_id uuid PRIMARY KEY,
     referrer_id uuid NOT NULL,
     created_at timestamptz NOT NULL DEFAULT NOW(),
     rewarded_at timestamptz,
     reward_days integer
   )`,
  `CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id, created_at DESC)`,

  // ---------------- sign-up OTPs (admin can hand out codes when email can't be delivered) ----------------
  `CREATE TABLE IF NOT EXISTS otp_verification (
     email text PRIMARY KEY,
     phone text,
     otp text,
     otp_expiry timestamptz,
     created_at timestamptz DEFAULT NOW()
   )`,
  `ALTER TABLE otp_verification ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()`,
  `ALTER TABLE otp_verification ADD COLUMN IF NOT EXISTS delivery text`,
  `ALTER TABLE otp_verification ADD COLUMN IF NOT EXISTS issued_by uuid`,
  // profile verification flag (older databases got it from a one-off script)
  `ALTER TABLE matrimony_profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false`,
  // set when an admin hands out a temporary password; cleared when the member picks their own
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false`,
  // images can live in Vercel Blob instead of the database
  `ALTER TABLE media_files ADD COLUMN IF NOT EXISTS blob_url text`,
  `ALTER TABLE media_files ALTER COLUMN data DROP NOT NULL`,
];

let ready = null;

export function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      for (const sql of STATEMENTS) await query(sql);
    })().catch((e) => {
      ready = null; // retry on next call
      console.error("[schema] ensureSchema failed:", e.message);
      throw e;
    });
  }
  return ready;
}

/**
 * SQL fragment excluding members blocked in either direction.
 * Takes USER ids (`meParam` like "$1", `otherUserCol` like "u.id"); blocks itself stores profile ids.
 */
export const notBlockedSql = (meParam, otherUserCol) =>
  `NOT EXISTS (SELECT 1 FROM blocks b
     JOIN matrimony_profiles ba ON ba.id = b.blocker_id
     JOIN matrimony_profiles bz ON bz.id = b.blocked_id
    WHERE (ba.user_id = ${meParam} AND bz.user_id = ${otherUserCol})
       OR (ba.user_id = ${otherUserCol} AND bz.user_id = ${meParam}))`;

/** True if either user has blocked the other (user ids). */
export async function isBlockedBetween(userA, userB) {
  await ensureSchema();
  const { rows } = await query(
    `SELECT EXISTS (
       SELECT 1 FROM blocks b
         JOIN matrimony_profiles ba ON ba.id = b.blocker_id
         JOIN matrimony_profiles bz ON bz.id = b.blocked_id
        WHERE (ba.user_id = $1::uuid AND bz.user_id = $2::uuid)
           OR (ba.user_id = $2::uuid AND bz.user_id = $1::uuid)
     ) AS blocked`,
    [userA, userB]
  );
  return Boolean(rows[0]?.blocked);
}

/** matrimony_profiles.id for a user id (or null). */
export async function profileIdOf(userId) {
  const { rows } = await query(`SELECT id FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0]?.id || null;
}
