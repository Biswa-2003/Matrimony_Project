// src/lib/error-log.js — store errors so admins can see problems without digging through server logs.
// Never stores request bodies, cookies or personal data: only a short message, the path and a digest.
let lastPrune = 0;

const scrub = (s) =>
  String(s || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b\d{10,}\b/g, "[number]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]")
    .slice(0, 500);

export async function logError(source, message, { path = null, digest = null } = {}) {
  try {
    const { query } = await import("@/lib/db");
    const { ensureSchema } = await import("@/lib/schema");
    await ensureSchema();
    await query(`INSERT INTO app_errors (source, message, path, digest) VALUES ($1, $2, $3, $4)`, [
      String(source).slice(0, 30),
      scrub(message) || "(no message)",
      path ? String(path).split("?")[0].slice(0, 200) : null,
      digest ? String(digest).slice(0, 80) : null,
    ]);
    // keep 30 days
    if (Date.now() - lastPrune > 6 * 60 * 60 * 1000) {
      lastPrune = Date.now();
      await query(`DELETE FROM app_errors WHERE created_at < NOW() - INTERVAL '30 days'`);
    }
  } catch {
    /* logging must never throw */
  }
}
