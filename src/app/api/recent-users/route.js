// File: src/app/api/recent-users/route.js
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const PROFILE_TABLE = 'matrimony_profiles';

/* ---------- Photo helpers (same as before) ---------- */
function normalizePath(p) {
  const fallback = '/uploads/default.jpg';
  if (!p) return fallback;

  let s = String(p).trim();

  if (/^https?:\/\//i.test(s) || s.startsWith('data:') || s.startsWith('blob:'))
    return s;

  s = s.replace(/^\/?public\//i, '');

  if (!/^\/?uploads\//i.test(s)) s = `uploads/${s.replace(/^\/+/, '')}`;

  if (!s.startsWith('/')) s = '/' + s;
  return s || fallback;
}

function primaryPhoto(photo) {
  const fallback = '/uploads/default.jpg';
  if (!photo) return fallback;

  try {
    if (Array.isArray(photo)) {
      const first = photo[0];
      if (typeof first === 'string') return normalizePath(first);
      if (first && typeof first === 'object') {
        const cand =
          first.url ||
          first.path ||
          first.location ||
          first.key ||
          first.name ||
          first.file;
        return normalizePath(cand || fallback);
      }
      return fallback;
    }

    if (typeof photo === 'string') {
      const t = photo.trim();
      if (t.startsWith('[')) {
        const arr = JSON.parse(t);
        return primaryPhoto(arr);
      }
      return normalizePath(t);
    }
  } catch {
    /* ignore parse errors */
  }
  return fallback;
}

/* ---------- Helpers ---------- */

async function hasColumn(table, column) {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function getViewerIdFromJwt() {
  let viewerId = null;
  try {
    const c = await cookies();
    let token;
    for (const name of ['token', 'auth', 'auth_token', 'jwt']) {
      const v = c.get(name)?.value;
      if (v) {
        token = v;
        break;
      }
    }
    if (!token) {
      const h = await headers();
      const auth = h.get('authorization') || h.get('Authorization');
      if (auth?.startsWith('Bearer ')) token = auth.slice(7).trim();
    }
    if (token && process.env.JWT_SECRET) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      viewerId = payload?.id || payload?.userId || null;
    }
  } catch {
    // bad / expired token -> treat as not logged in
  }
  return viewerId;
}

// 🔹 NEW: does this user currently have an active subscription?
async function userHasActiveSubscription(userId) {
  if (!userId) return false;
  const { rows } = await query(
    `
      SELECT 1
      FROM public.subscriptions
      WHERE user_id = $1
        AND ends_at >= NOW()
      LIMIT 1
    `,
    [userId]
  );
  return rows.length > 0;
}

/* ---------- Route ---------- */

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      20,
      Math.max(1, parseInt(url.searchParams.get('limit') || '8', 10))
    );
    const months = Math.min(
      24,
      Math.max(1, parseInt(url.searchParams.get('months') || '3', 10))
    );

    // "since" date (last N months)
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setMonth(since.getMonth() - months);
    const sinceStr = since.toISOString().slice(0, 10);

    const viewerId = await getViewerIdFromJwt();
    const viewerIsPremium = await userHasActiveSubscription(viewerId);

    // column discovery
    const u_has_first_name = await hasColumn('users', 'first_name');
    const u_has_photo = await hasColumn('users', 'photo');
    const u_has_created = await hasColumn('users', 'created_at');
    const u_has_updated = await hasColumn('users', 'updated_at');

    const mp_has_gender = await hasColumn(PROFILE_TABLE, 'gender');
    const mp_has_matri_id = await hasColumn(PROFILE_TABLE, 'matri_id');
    const mp_has_photo = await hasColumn(PROFILE_TABLE, 'photo');
    const mp_has_updated = await hasColumn(PROFILE_TABLE, 'updated_at');

    // viewer gender (for opposite-gender targeting, optional)
    let viewerGender = null;

    if (viewerId && mp_has_gender) {
      const vr = await query(
        `SELECT UPPER(LEFT(mp.gender,1)) AS g
           FROM users u
           JOIN ${PROFILE_TABLE} mp ON mp.user_id = u.id
          WHERE u.id = $1
          LIMIT 1`,
        [viewerId]
      );
      viewerGender = vr.rows?.[0]?.g || null;
    }
    const targetGender =
      viewerGender === 'F' ? 'M' : viewerGender === 'M' ? 'F' : null;

    // SELECT list
    const selectParts = [`u.id AS user_id`];
    if (u_has_first_name)
      selectParts.push(`u.first_name`);
    else
      selectParts.push(`NULL AS first_name`);

    let photoExpr = 'NULL';
    if (mp_has_photo && u_has_photo)
      photoExpr = 'COALESCE(ph.path, mp.photo, u.photo)';
    else if (mp_has_photo)
      photoExpr = 'COALESCE(ph.path, mp.photo)';
    else if (u_has_photo)
      photoExpr = 'COALESCE(ph.path, u.photo)';
    else
      photoExpr = 'ph.path';
    selectParts.push(`${photoExpr} AS photo_raw`);

    if (mp_has_matri_id) selectParts.push(`mp.matri_id`);
    else selectParts.push(`NULL AS matri_id`);

    if (mp_has_gender) selectParts.push(`mp.gender`);
    else selectParts.push(`NULL AS gender`);

    const lastUpdatedPieces = [];
    if (mp_has_updated) lastUpdatedPieces.push('mp.updated_at');
    if (u_has_updated) lastUpdatedPieces.push('u.updated_at');
    if (u_has_created) lastUpdatedPieces.push('u.created_at');
    const lastUpdatedExpr = lastUpdatedPieces.length
      ? `COALESCE(${lastUpdatedPieces.join(', ')})`
      : `NOW()`;
    selectParts.push(`${lastUpdatedExpr} AS last_updated`);

    // 🔹 NEW: per-profile premium flag
    selectParts.push(`
      EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.user_id = u.id
          AND s.ends_at >= NOW()
      ) AS is_premium
    `);

    // 🔹 NEW: Connection Status (using User IDs)
    // interests table uses user_id (not profile_id) for from/to_profile columns
    if (viewerId) {
      selectParts.push(`
        (
          SELECT status
          FROM interests i
          WHERE 
            (i.from_profile = CAST($3 AS uuid) AND i.to_profile = u.id)
            OR 
            (i.from_profile = u.id AND i.to_profile = CAST($3 AS uuid))
          ORDER BY CASE WHEN status='accepted' THEN 1 ELSE 2 END, created_at DESC
          LIMIT 1
        ) AS connection_status
      `);
    } else {
      selectParts.push(`NULL AS connection_status`);
    }

    // WHERE ...

    // WHERE
    const where = [];
    const params = [];

    if (mp_has_gender) {
      params.push(targetGender); // $1
      where.push(
        `($1::text IS NULL OR UPPER(LEFT(mp.gender,1)) = $1)`
      );
    } else {
      params.push(null);
      where.push(`($1::text IS NULL)`);
    }

    params.push(sinceStr); // $2
    where.push(`${lastUpdatedExpr} >= $2`);

    params.push(viewerId ?? null); // $3
    where.push(`($3::text IS NULL OR u.id::text <> $3::text)`);

    const sql = `
      SELECT
        ${selectParts.join(',\n        ')}
      FROM users u
      JOIN ${PROFILE_TABLE} mp ON mp.user_id = u.id

      LEFT JOIN LATERAL (
        SELECT p.path
        FROM photos p
        WHERE p.profile_id = mp.id
        ORDER BY p.is_primary DESC, p.created_at DESC
        LIMIT 1
      ) ph ON TRUE

      WHERE ${where.join(' AND ')}
      ORDER BY ${lastUpdatedExpr} DESC
      LIMIT $4
    `;
    params.push(limit); // $4

    const { rows } = await query(sql, params);

    const users = rows.map((r) => {
      const matri =
        r.matri_id || `DU${String(r.user_id ?? '').padStart(6, '0')}`;
      return {
        user_id: r.user_id,
        first_name: r.first_name ?? 'Member',
        matri_id: matri,
        gender: r.gender || '',
        photo: primaryPhoto(r.photo_raw),
        created_at: r.last_updated,
        is_premium: !!r.is_premium, // 🔹 important for frontend
        connection_status: r.connection_status || 'none',
      };
    });

    return NextResponse.json({
      ok: true,
      users,
      viewerIsPremium,
      meta: {
        months,
        since: sinceStr,
        targetGender: targetGender || 'ALL',
      },
    });
  } catch (err) {
    console.error('❌ recent-users 500:', err.stack || err);
    return NextResponse.json(
      { error: 'Error fetching recent users' },
      { status: 500 }
    );
  }
}
