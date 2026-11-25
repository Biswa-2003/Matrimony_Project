/**
 * Moves member photos that are still files in public/uploads into the database (media_files),
 * so they keep working on hosts with no permanent disk (Vercel).
 *
 *   node --env-file=.env.local scripts/move-photos-to-db.mjs            (dry run: only reports)
 *   node --env-file=.env.local scripts/move-photos-to-db.mjs --apply    (does the move)
 *
 * Run it against the database the live site uses (set DATABASE_URL to that one), from the project
 * folder that holds the photo files. Safe to repeat: photos already moved are skipped.
 * The files on disk are left in place.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
const isLocal = (url || process.env.DB_HOST || "").match(/localhost|127\.0\.0\.1/);
const client = new pg.Client(
  url
    ? { connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } }
    : { host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT || 5432 }
);

function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

await client.connect();
const { rows } = await client.query(
  `SELECT p.id, p.path, mp.user_id FROM photos p JOIN matrimony_profiles mp ON mp.id = p.profile_id
    WHERE p.media_id IS NULL ORDER BY p.created_at`
);
console.log(`${rows.length} photo(s) still stored as files.${APPLY ? "" : " (dry run - add --apply to move them)"}`);

let moved = 0, missing = 0, bad = 0;
for (const r of rows) {
  const rel = String(r.path || "").replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  const file = path.join("public", rel.replace(/^\/+/, ""));
  if (!rel.startsWith("/uploads/") || !fs.existsSync(file)) {
    console.log(`  missing file  ${r.id}  ${r.path}`);
    missing++;
    continue;
  }
  const buf = fs.readFileSync(file);
  const type = sniff(buf);
  if (!type) {
    console.log(`  not an image  ${r.id}  ${r.path}`);
    bad++;
    continue;
  }
  if (APPLY) {
    await client.query("BEGIN");
    const m = await client.query(
      `INSERT INTO media_files (content_type, data, size_bytes, original_name) VALUES ($1, $2, $3, $4) RETURNING id`,
      [type, buf, buf.length, `member-photo-${r.user_id}`]
    );
    await client.query(`UPDATE photos SET media_id = $1, path = $2 WHERE id = $3`, [m.rows[0].id, `/api/member-photo/${r.id}`, r.id]);
    await client.query("COMMIT");
  }
  console.log(`  ${APPLY ? "moved" : "would move"}  ${r.id}  ${r.path}  (${Math.round(buf.length / 1024)} KB)`);
  moved++;
}
console.log(`Done. ${APPLY ? "Moved" : "Would move"}: ${moved}, missing file: ${missing}, not an image: ${bad}`);
await client.end();
