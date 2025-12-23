// src/lib/auth.js
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

/**
 * Reads "token" or "jwt" cookie, verifies JWT,
 * and returns the users.id from the payload (or null).
 */
export async function getUserIdFromCookie() {
  const c = await cookies();
  const token = c.get('token')?.value || c.get('jwt')?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.id || payload.userId || null;
  } catch {
    return null;
  }
}

/**
 * Convenience helper used by your routes.
 * Returns { id } or null, so callers can do:
 *   const me = await getAuthUser();
 *   const meId = me?.id || sp.get('me');
 */
export async function getAuthUser() {
  const id = await getUserIdFromCookie();
  return id ? { id } : null;
}
