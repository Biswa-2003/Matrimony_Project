import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromCookie } from '@/lib/auth';

export async function GET() {
  // 1) Auth
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    // 2) Fetch id + best possible display name, role, email, photo
    const { rows } = await query(
      `
      SELECT
        u.id,
        u.email,
        COALESCE(u.role, 'user') AS role,
        pht.photo_url,
        mp.matri_id,
        mp.gender,
        COALESCE(
          NULLIF(
            INITCAP(TRIM(CONCAT_WS(' ',
              NULLIF(TRIM(mp.first_name), ''),
              NULLIF(TRIM(mp.last_name),  '')
            ))), ''
          ),
          NULLIF(
            INITCAP(TRIM(CONCAT_WS(' ',
              NULLIF(TRIM(u.first_name), ''),
              NULLIF(TRIM(u.last_name),  '')
            ))), ''
          ),
          UPPER(split_part(u.email, '@', 1))
        ) AS name
      FROM users u
      LEFT JOIN matrimony_profiles mp ON mp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT path AS photo_url
        FROM photos ph
        WHERE ph.profile_id = mp.id
        ORDER BY ph.is_primary DESC, ph.created_at DESC
        LIMIT 1
      ) pht ON true
      WHERE u.id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    const { id, name, role, email, photo_url, matri_id, gender } = rows[0];
    return NextResponse.json({
      ok: true,
      id,
      name: name || '',
      role: role || 'user',
      email: email || '',
      photo_url: photo_url || null,
      matri_id: matri_id || null,
      gender: gender || null,
    }, { status: 200 });
  } catch (err) {
    console.error('GET /api/me error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
