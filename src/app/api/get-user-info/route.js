// src/app/api/get-user-info/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

// ---- helpers ----
function readTokenFromRequest(request) {
  // Prefer cookie (your client fetches with credentials: 'same-origin')
  const tokenFromCookie =
    request.cookies.get('token')?.value ||
    request.cookies.get('auth_token')?.value ||
    request.cookies.get('auth')?.value ||
    null;

  if (tokenFromCookie) return tokenFromCookie;

  // Fallback: Authorization header
  const authHeader =
    request.headers.get('authorization') ||
    request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function normalizePhoto(raw) {
  if (Array.isArray(raw)) return raw.length ? raw : ['default.jpg'];
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return ['default.jpg'];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.length ? parsed : ['default.jpg'];
      if (typeof parsed === 'string' && parsed) return [parsed];
      return ['default.jpg'];
    } catch {
      return [s];
    }
  }
  return ['default.jpg'];
}

// ---- handler ----
export async function GET(request) {
  try {
    const token = readTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('get-user-info: JWT_SECRET is missing');
      return NextResponse.json({ error: 'Server misconfig' }, { status: 500 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      console.error('get-user-info: jwt.verify failed:', e?.message || e);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded?.id ?? decoded?.userId;
    if (!userId) {
      console.error('get-user-info: token payload missing id/userId:', decoded);
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // ⬇️ Adjust table/column names to your schema if different
    const sql = `
      SELECT
        u.id AS user_id,

        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''),
          NULLIF(BTRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
          u.email,
          'User'
        ) AS display_name,

        COALESCE(mp.matri_id, '') AS matri_id,                                         
        COALESCE(NULLIF(u.phone, ''), '') AS phone,

        COALESCE(p.path, 'default.jpg') AS raw_photo,

        COALESCE(r.name, '') AS religion_name,
        COALESCE(c.name, '') AS caste_name

      FROM users u
      LEFT JOIN matrimony_profiles mp ON mp.user_id = u.id
      LEFT JOIN religions r ON r.id = mp.religion_id
      LEFT JOIN castes    c ON c.id = mp.caste_id
      LEFT JOIN LATERAL (
        SELECT ph.path
        FROM photos ph
        WHERE ph.profile_id = mp.id
        ORDER BY (CASE WHEN ph.is_primary THEN 1 ELSE 0 END) DESC,
                 ph.created_at DESC, ph.id DESC
        LIMIT 1
      ) p ON TRUE
      WHERE u.id = $1
      LIMIT 1
    `;

    let row;
    try {
      const res = await query(sql, [userId]);
      row = res.rows?.[0];
    } catch (dbErr) {
      console.error('get-user-info: DB query failed:', dbErr);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const phone = row.phone || '';

    return NextResponse.json({
      user: {
        id: row.user_id,
        name: row.display_name || '',
        matri_id: row.matri_id || '',
        phone,
        mobile: phone,
        photo: normalizePhoto(row.raw_photo),
        religion: row.religion_name || '',
        caste: row.caste_name || '',
        verified: true,
      },
    });
  } catch (err) {
    console.error('❌ get-user-info: unexpected failure:', err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
