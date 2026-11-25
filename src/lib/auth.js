// src/lib/auth.js
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { isSessionLive } from '@/lib/sessions';

/**
 * Verify a LOGIN token: signature + expiry (jwt.verify), not a special-purpose token,
 * and the session hasn't been logged out / invalidated by a password change.
 * Throws like jwt.verify does, so existing try/catch call sites keep working.
 */
export async function verifyLogin(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload?.purpose) throw new Error('not a login token');
  if (!(await isSessionLive(payload))) throw new Error('session ended');
  return payload;
}

/**
 * Reads "token" or "jwt" cookie, verifies JWT,
 * and returns the users.id from the payload (or null).
 */
export async function getUserIdFromCookie() {
  const c = await cookies();
  const token = c.get('token')?.value || c.get('jwt')?.value;
  if (!token) return null;

  try {
    const payload = await verifyLogin(token);
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

/**
 * Returns full JWT payload or null.
 */
export async function getAuthPayload() {
  const c = await cookies();
  const token = c.get('token')?.value || c.get('jwt')?.value;
  if (!token) return null;

  try {
    return await verifyLogin(token);
  } catch {
    return null;
  }
}

/**
 * Checks if current authenticated user has admin role.
 */
export async function isAdmin() {
  const payload = await getAuthPayload();
  if (!payload?.id) return false;
  if (payload.role === 'admin') return true;

  // Fallback DB check
  try {
    const { query } = await import('@/lib/db');
    const res = await query('SELECT role FROM users WHERE id = $1', [payload.id]);
    return res.rows[0]?.role === 'admin';
  } catch {
    return false;
  }
}
