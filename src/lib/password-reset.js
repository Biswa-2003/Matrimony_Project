// src/lib/password-reset.js
// Single-use password-reset tokens.
//
// The token is a JWT signed with JWT_SECRET + the user's CURRENT password hash and
// tagged purpose:"pwreset". That gives us, with no extra table:
//   • single use  – once the password changes, the hash changes, so the old link stops verifying
//   • separation  – a login cookie can't be used as a reset token, and a reset token can't be
//                   used as a login cookie (login cookies are signed with JWT_SECRET alone)
//   • expiry      – 30 minutes
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";

const PURPOSE = "pwreset";
export const RESET_TTL_MINUTES = 30;

const keyFor = (passwordHash) => `${process.env.JWT_SECRET}::${PURPOSE}::${passwordHash || ""}`;

export function signResetToken(user) {
  return jwt.sign({ sub: String(user.id), purpose: PURPOSE }, keyFor(user.password_hash), {
    expiresIn: `${RESET_TTL_MINUTES}m`,
  });
}

/**
 * Returns { user } when the token is valid, or { error: "expired" | "invalid" }.
 * user = { id, email, first_name, password_hash }
 */
export async function verifyResetToken(token) {
  if (!token || typeof token !== "string" || token.length > 2048) return { error: "invalid" };
  const unverified = jwt.decode(token);
  if (!unverified || unverified.purpose !== PURPOSE || !unverified.sub) return { error: "invalid" };

  const { rows } = await query(
    "SELECT id, email, first_name, password_hash FROM users WHERE id = $1",
    [unverified.sub]
  );
  const user = rows[0];
  if (!user) return { error: "invalid" };

  try {
    const payload = jwt.verify(token, keyFor(user.password_hash));
    if (payload.purpose !== PURPOSE || String(payload.sub) !== String(user.id)) return { error: "invalid" };
    return { user };
  } catch (e) {
    // a used link (password already changed) fails the signature → "invalid", which is correct
    return { error: e?.name === "TokenExpiredError" ? "expired" : "invalid" };
  }
}

export function maskEmail(email) {
  const [u, d] = String(email || "").split("@");
  if (!d) return "";
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d}`;
}
