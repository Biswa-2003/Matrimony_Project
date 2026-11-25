// src/lib/moderation.js
// Lightweight content checks used by chat and profile text.
// Returns reasons, never throws. Keep rules conservative: a hit FLAGS content for admin
// review and shows the reader a safety tip; it does not silently delete anything.

const PHONE = /(?:\+?91[\s-]*)?(?:\d[\s\-.]*){10,}/; // 10+ digits, allowing separators
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|in|net|org|me|ly|io)\b/i;
const OFF_PLATFORM = /\b(whats\s?app|telegram|insta(?:gram)?\s*(?:id|handle)?|snap\s?chat|signal app|wa\.me)\b/i;
const MONEY = /\b(send (?:me )?money|transfer (?:the )?money|upi|gpay|google pay|phone ?pe|paytm|bank (?:account|details)|ifsc|otp|gift card|customs (?:fee|duty)|western union|crypto|bitcoin|invest(?:ment)? (?:plan|scheme)|loan)\b/i;

export function scanText(text) {
  const s = String(text || "");
  const reasons = [];
  if (PHONE.test(s)) reasons.push("phone number");
  if (EMAIL.test(s)) reasons.push("email address");
  if (LINK.test(s)) reasons.push("link");
  if (OFF_PLATFORM.test(s)) reasons.push("off-platform contact");
  if (MONEY.test(s)) reasons.push("money / payment request");
  return { flagged: reasons.length > 0, reasons, scam: MONEY.test(s) };
}

/** Basic clean-up for user-typed text: trim, collapse 3+ blank lines, strip control chars. */
export function cleanText(text, max = 1000) {
  return String(text || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/**
 * Scan a member's free-text profile fields after they save, and open / clear a flag for admins.
 * Server-only (imports the DB lazily so this file stays usable from tests).
 */
export async function flagProfileText(userId, fields) {
  try {
    const { query } = await import("@/lib/db");
    const { ensureSchema } = await import("@/lib/schema");
    await ensureSchema();
    for (const [field, value] of Object.entries(fields)) {
      const scan = scanText(value);
      if (scan.flagged) {
        await query(
          `INSERT INTO content_flags (user_id, field, excerpt, reasons, status, created_at)
           VALUES ($1, $2, $3, $4, 'open', NOW())
           ON CONFLICT (user_id, field) DO UPDATE
             SET excerpt = EXCLUDED.excerpt, reasons = EXCLUDED.reasons, status = 'open', created_at = NOW(), reviewed_at = NULL`,
          [userId, field, String(value).slice(0, 500), scan.reasons]
        );
      } else {
        await query(`DELETE FROM content_flags WHERE user_id = $1 AND field = $2 AND status = 'open'`, [userId, field]);
      }
    }
  } catch (e) {
    console.error("[moderation] flagProfileText:", e.message);
  }
}
