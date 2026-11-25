import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

/**
 * Database-backed media + site settings.
 * Images live in Postgres (bytea) so uploads survive serverless deploys (Vercel has no persistent disk).
 */

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Editable image slots on the public website, with the built-in artwork used when none is uploaded. */
export const MEDIA_SLOTS = {
  home_hero: { label: "Home — hero artwork", where: "Big image beside the headline on the home page", fallback: "/images/couple-mandap.svg", ratio: "1 / 1.15" },
  home_welcome: { label: "Home — welcome section", where: "Framed picture in “Two Hearts, Two Families”", fallback: "/images/couple-mandap.svg", ratio: "1 / 1" },
  auth_art: { label: "Login & sign-up artwork", where: "Left panel on login, forgot & reset password", fallback: "/images/couple-mandap.svg", ratio: "1 / 1" },
  tradition_1: { label: "Tradition card 1 — Roka & Engagement", where: "Home → Moments We Help Create", fallback: "/images/ritual-rings.svg", ratio: "1 / 1" },
  tradition_2: { label: "Tradition card 2 — Mehendi & Haldi", where: "Home → Moments We Help Create", fallback: "/images/ritual-mehendi.svg", ratio: "1 / 1" },
  tradition_3: { label: "Tradition card 3 — Pheras & Vows", where: "Home → Moments We Help Create", fallback: "/images/ritual-diya.svg", ratio: "1 / 1" },
  tradition_4: { label: "Tradition card 4 — Griha Pravesh", where: "Home → Moments We Help Create", fallback: "/images/ritual-kalash.svg", ratio: "1 / 1" },
  story_placeholder: { label: "Success story placeholder", where: "Used when a story has no couple photo", fallback: "/images/couple-mandap.svg", ratio: "1 / 1" },
};

export const DEFAULT_ANNOUNCEMENT = { enabled: false, text: "", linkText: "", linkUrl: "", tone: "gold" };

/** Detect real image type from magic bytes (never trust the filename or client content-type). SVG is rejected on purpose. */
export function sniffImageType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}

/** Validate + store an uploaded File; returns { id, url } or throws an Error with a user-facing message. */
export async function storeImage(file) {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) throw new Error("Please choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is too large — please keep it under 4 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(buf);
  if (!type) throw new Error("Only JPG, PNG, WebP or GIF images are allowed.");
  await ensureSchema();
  const { rows } = await query(
    `INSERT INTO media_files (content_type, data, size_bytes, original_name) VALUES ($1, $2, $3, $4) RETURNING id`,
    [type, buf, buf.length, String(file.name || "").slice(0, 200)]
  );
  return { id: rows[0].id, url: `/api/media/${rows[0].id}` };
}

export async function getSetting(key, fallback = null) {
  await ensureSchema();
  const { rows } = await query(`SELECT value FROM site_settings WHERE key = $1`, [key]);
  return rows[0]?.value ?? fallback;
}

export async function setSetting(key, value) {
  await ensureSchema();
  await query(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

/** All public site content: { media: { slot: url }, announcement } */
export async function getSiteContent() {
  await ensureSchema();
  const { rows } = await query(`SELECT key, value FROM site_settings WHERE key LIKE 'media:%' OR key = 'announcement'`);
  const media = Object.fromEntries(Object.entries(MEDIA_SLOTS).map(([k, v]) => [k, v.fallback]));
  let announcement = DEFAULT_ANNOUNCEMENT;
  for (const r of rows) {
    if (r.key === "announcement") announcement = { ...DEFAULT_ANNOUNCEMENT, ...r.value };
    else {
      const slot = r.key.slice(6);
      if (MEDIA_SLOTS[slot] && r.value?.url) media[slot] = r.value.url;
    }
  }
  return { media, announcement };
}
