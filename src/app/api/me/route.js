import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserIdFromCookie } from '@/lib/auth';

export async function GET() {
  // 1) Auth
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    // 2) Fetch id + best possible display name
    const { rows } = await query(
      `
      SELECT
        u.id,
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
      WHERE u.id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    const { id, name } = rows[0];
    return NextResponse.json({ ok: true, id, name: name || '' }, { status: 200 });
  } catch (err) {
    console.error('GET /api/me error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
