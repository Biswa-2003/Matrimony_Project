/**
 * Fresh start: deletes ALL members and everything they created, so registration starts from zero.
 *
 * KEEPS: the admin account (KEEP_ADMIN_EMAIL, default admin@matrimony.com), dropdown lists
 * (religions, castes, countries, states, cities, educations, professions, languages, hobbies),
 * plans, coupons, site settings and site images.
 * DELETES: every other user, profiles, photos, interests, chats, payments, subscriptions,
 * success stories (unless --keep-stories), sessions, OTPs, logs.
 *
 *   node --env-file=.env.local scripts/reset-members.mjs                          (dry run: only counts)
 *   node --env-file=.env.local scripts/reset-members.mjs --check                  (does it all, then undoes it)
 *   node --env-file=.env.local scripts/reset-members.mjs --apply --i-have-a-backup
 *
 * Make a backup first (npm run db:backup). Runs in one transaction: if anything fails, nothing changes.
 */
import pg from "pg";

const CHECK = process.argv.includes("--check"); // run every delete, then undo (proves it would work)
const APPLY = process.argv.includes("--apply") || CHECK;
const KEEP_STORIES = process.argv.includes("--keep-stories");
const KEEP_ADMIN = (process.env.KEEP_ADMIN_EMAIL || "admin@matrimony.com").toLowerCase();

if (APPLY && !CHECK && !process.argv.includes("--i-have-a-backup")) {
  console.error("Take a backup first (npm run db:backup), then add --i-have-a-backup.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
const isLocal = (url || process.env.DB_HOST || "").match(/localhost|127\.0\.0\.1/);
const db = new pg.Client(
  url
    ? { connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } }
    : { host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT || 5432 }
);

// member activity tables: emptied completely (children before parents)
const WIPE = [
  "messages", "conversations", "content_flags", "member_warnings", "photo_requests",
  "contact_unlocks", "profile_contacts_viewed", "profile_views", "shortlists", "blocks", "reports",
  "interests", "saved_searches",
  "pref_castes", "pref_cities", "pref_countries", "pref_educations", "pref_languages",
  "pref_professions", "pref_religions", "pref_states", "partner_preferences",
  "profile_hobbies", "profile_languages",
  "coupon_redemptions", "referrals", "payments", "subscriptions",
  "email_log", "user_preferences", "user_sessions", "user_otps", "otp_verification",
  "contact_messages", "admin_audit", "app_errors",
];

await db.connect();
const where = url ? new URL(url).host : `${process.env.DB_HOST}/${process.env.DB_NAME}`;
const exists = new Set((await db.query(`SELECT relname FROM pg_stat_user_tables`)).rows.map((r) => r.relname));
const count = async (sql, params = []) => (await db.query(sql, params)).rows[0].n;

const admin = (await db.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [KEEP_ADMIN])).rows[0];
if (!admin) {
  console.error(`Admin ${KEEP_ADMIN} not found - stopping so you are not locked out. Set KEEP_ADMIN_EMAIL.`);
  process.exit(1);
}

console.log(`Database: ${where}`);
console.log(`Keeping admin: ${KEEP_ADMIN}\n`);
const plan = [];
for (const t of WIPE.filter((t) => exists.has(t))) plan.push([t, await count(`SELECT COUNT(*)::int n FROM "${t}"`)]);
plan.push(["photos", await count(`SELECT COUNT(*)::int n FROM photos`)]);
plan.push(["media_files (member photos only)", await count(`SELECT COUNT(*)::int n FROM media_files WHERE id IN (SELECT media_id FROM photos WHERE media_id IS NOT NULL)`)]);
plan.push(["success_stories", KEEP_STORIES ? 0 : await count(`SELECT COUNT(*)::int n FROM success_stories`)]);
plan.push(["matrimony_profiles", await count(`SELECT COUNT(*)::int n FROM matrimony_profiles WHERE user_id IS DISTINCT FROM $1`, [admin.id])]);
plan.push(["users", await count(`SELECT COUNT(*)::int n FROM users WHERE id <> $1`, [admin.id])]);
for (const [t, n] of plan) if (n) console.log(`  ${APPLY ? "deleting" : "would delete"}  ${String(n).padStart(5)}  ${t}`);

if (!APPLY) {
  console.log("\nDry run - nothing changed. Add --apply --i-have-a-backup to do it.");
  await db.end();
  process.exit(0);
}

try {
  await db.query("BEGIN");
  const memberMedia = (await db.query(`SELECT media_id FROM photos WHERE media_id IS NOT NULL`)).rows.map((r) => r.media_id);
  for (const t of WIPE.filter((t) => exists.has(t))) await db.query(`DELETE FROM "${t}"`);
  await db.query(`DELETE FROM photos`);
  if (memberMedia.length) await db.query(`DELETE FROM media_files WHERE id = ANY($1::uuid[])`, [memberMedia]);
  if (KEEP_STORIES) await db.query(`UPDATE success_stories SET user_id = NULL`);
  else await db.query(`DELETE FROM success_stories`);
  await db.query(`DELETE FROM matrimony_profiles WHERE user_id IS DISTINCT FROM $1`, [admin.id]);
  await db.query(`DELETE FROM users WHERE id <> $1`, [admin.id]);
  if (CHECK) {
    const left = await count(`SELECT COUNT(*)::int n FROM users`);
    await db.query("ROLLBACK");
    console.log(`\nCheck passed: every delete worked (users left would be: ${left}). Undone - nothing changed.`);
    await db.end();
    process.exit(0);
  }
  await db.query("COMMIT");
  console.log("\nDone. Only the admin account is left; dropdown lists, plans and settings are kept.");
} catch (e) {
  await db.query("ROLLBACK");
  console.error("\nStopped - nothing was changed:", e.message);
  process.exitCode = 1;
}
await db.end();
