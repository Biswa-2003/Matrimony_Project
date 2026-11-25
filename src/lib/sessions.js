// src/lib/sessions.js
// Login sessions: every login gets a session id (JWT `jti`) stored in user_sessions, so members
// can see their devices and log any of them out. Checked on every authenticated request with a
// short in-memory cache so it costs at most one small query per user per 10 seconds.
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

export const SESSION_HOURS = 2;
const CACHE_MS = 10 * 1000; // revocations take effect everywhere within ~10s (each route/instance keeps its own cache)
const cache = new Map(); // key → { ok, at }

function uaSummary(ua = "") {
  const s = String(ua);
  const browser = /Edg\//.test(s) ? "Edge" : /OPR\//.test(s) ? "Opera" : /Chrome\//.test(s) ? "Chrome" : /Firefox\//.test(s) ? "Firefox" : /Safari\//.test(s) ? "Safari" : "Browser";
  const os = /Android/.test(s) ? "Android" : /iPhone|iPad|iOS/.test(s) ? "iPhone / iPad" : /Windows/.test(s) ? "Windows" : /Mac OS X/.test(s) ? "Mac" : /Linux/.test(s) ? "Linux" : "Unknown device";
  return `${browser} on ${os}`;
}
export { uaSummary };

const ipOf = (req) => (req?.headers?.get?.("x-forwarded-for") || "").split(",")[0].trim() || req?.headers?.get?.("x-real-ip") || null;

/** Create a session row and return a signed login token carrying its id. */
export async function issueLoginToken(user, req) {
  await ensureSchema();
  const jti = crypto.randomUUID();
  await query(
    `INSERT INTO user_sessions (id, user_id, ip, user_agent) VALUES ($1, $2, $3, $4)`,
    [jti, user.id, ipOf(req), String(req?.headers?.get?.("user-agent") || "").slice(0, 300)]
  );
  const token = jwt.sign(
    { id: user.id, name: user.first_name, email: user.email, matri_id: user.matri_id, role: user.role || "user" },
    process.env.JWT_SECRET,
    { expiresIn: `${SESSION_HOURS}h`, jwtid: jti }
  );
  return { token, jti };
}

/** Attach the login cookie to a NextResponse. */
export function setLoginCookie(response, token) {
  response.cookies.set("token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * SESSION_HOURS,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

/**
 * Is this verified JWT payload still a live session?
 * Rejects tokens issued before a password change / "log out everywhere", and revoked sessions.
 */
export async function isSessionLive(payload) {
  const userId = payload?.id || payload?.userId;
  if (!userId) return false;
  const key = `${userId}:${payload.jti || "-"}:${payload.iat || 0}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.ok;

  let ok = true;
  try {
    await ensureSchema();
    const { rows } = await query(
      `SELECT u.password_changed_at, u.sessions_revoked_at, u.banned_at, u.suspended_until,
              s.revoked_at AS session_revoked, s.id AS session_id, s.last_seen_at
         FROM users u
         LEFT JOIN user_sessions s ON s.id = $2::uuid AND s.user_id = u.id
        WHERE u.id = $1`,
      [userId, payload.jti || null]
    );
    const r = rows[0];
    if (!r) ok = false;
    else {
      const issuedMs = (payload.iat || 0) * 1000;
      // 1s grace: iat is in whole seconds
      const cutoff = Math.max(new Date(r.password_changed_at || 0).getTime(), new Date(r.sessions_revoked_at || 0).getTime());
      if (cutoff && issuedMs + 1000 < cutoff) ok = false;
      if (payload.jti && (!r.session_id || r.session_revoked)) ok = false;
      if (r.banned_at || (r.suspended_until && new Date(r.suspended_until) > new Date())) ok = false;
      // keep "last active" fresh, at most every 5 minutes
      if (ok && r.session_id && Date.now() - new Date(r.last_seen_at).getTime() > 5 * 60 * 1000) {
        query(`UPDATE user_sessions SET last_seen_at = NOW() WHERE id = $1`, [r.session_id]).catch(() => {});
      }
    }
  } catch (e) {
    // fail open on DB errors so a blip doesn't log everyone out; the JWT itself was already verified
    console.error("[sessions] check failed:", e.message);
    ok = true;
  }
  if (cache.size > 5000) cache.clear();
  cache.set(key, { ok, at: Date.now() });
  return ok;
}

/** Forget cached results for a user (call after revoking). */
export function dropSessionCache(userId) {
  for (const k of cache.keys()) if (k.startsWith(`${userId}:`)) cache.delete(k);
}

export async function revokeSession(userId, sessionId) {
  const { rows } = await query(
    `UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id`,
    [sessionId, userId]
  );
  dropSessionCache(userId);
  return rows.length > 0;
}

/** Log out everywhere (optionally keeping one session, e.g. the device that changed the password). */
export async function revokeAllSessions(userId, keepSessionId = null) {
  await ensureSchema();
  await query(
    `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [userId, keepSessionId]
  );
  if (!keepSessionId) await query(`UPDATE users SET sessions_revoked_at = NOW() WHERE id = $1`, [userId]);
  dropSessionCache(userId);
}
