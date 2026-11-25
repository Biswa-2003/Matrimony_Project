// src/lib/share.js
// Family share links: a member shares THEIR OWN profile with family via a signed link that
// works without logging in for 7 days and shows only basic, non-contact details.
import jwt from "jsonwebtoken";

const PURPOSE = "share";
export const SHARE_DAYS = 7;
const key = () => `${process.env.JWT_SECRET}::${PURPOSE}`;

export function signShareToken(matriId) {
  return jwt.sign({ m: String(matriId), purpose: PURPOSE }, key(), { expiresIn: `${SHARE_DAYS}d` });
}

/** → matri id, or null if invalid/expired */
export function verifyShareToken(token) {
  try {
    if (!token || String(token).length > 1024) return null;
    const p = jwt.verify(String(token), key());
    return p.purpose === PURPOSE && p.m ? p.m : null;
  } catch {
    return null;
  }
}
