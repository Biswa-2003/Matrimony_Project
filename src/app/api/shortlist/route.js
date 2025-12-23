// // src/app/api/matrimoney/shortlist/route.js
// export const dynamic = "force-dynamic";
// export const revalidate = 0;

// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import jwt from "jsonwebtoken";
// import { query } from "@/lib/db";

// // --- helpers ---
// async function getUserIdFromCookie() {
//   const c = await cookies();
//   const token =
//     c.get("token")?.value || c.get("auth_token")?.value || c.get("auth")?.value;
//   const secret = process.env.JWT_SECRET;
//   if (!token || !secret) return null;
//   try {
//     const d = jwt.verify(token, secret);
//     return d?.id ?? d?.userId ?? null;
//   } catch {
//     return null;
//   }
// }

// async function getProfileByUser(userId) {
//   try {
//     const a = await query(
//       `SELECT id, user_id FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`,
//       [userId]
//     );
//     if (a.rowCount) return a.rows[0];
//   } catch {}
//   const b = await query(
//     `SELECT id, user_id FROM matri_profiles WHERE user_id = $1 LIMIT 1`,
//     [userId]
//   );
//   return b.rows?.[0] || null;
// }

// // --- GET ---
// export async function GET(req) {
//   const sp = new URL(req.url).searchParams;
//   const limit = Math.min(Number(sp.get("limit") || 20), 50);
//   const offset = Math.max(Number(sp.get("offset") || 0), 0);

//   try {
//     // 1) resolve viewer
//     const meUserId = await getUserIdFromCookie();
//     if (!meUserId) {
//       return NextResponse.json(
//         { items: [], total: 0, limit, offset, reason: "not_logged_in" },
//         { status: 200 }
//       );
//     }
//     const p = await getProfileByUser(meUserId);
//     const fromProfileId = p?.id || null;
//     if (!fromProfileId) {
//       return NextResponse.json(
//         { items: [], total: 0, limit, offset, reason: "no_profile_for_user" },
//         { status: 200 }
//       );
//     }

//     // 2) pull latest interest row per target you sent
//     const base = await query(
//       `
//       SELECT DISTINCT ON (i.to_profile)
//              i.to_profile, i.status, i.updated_at
//         FROM interests i
//        WHERE i.status IN ('sent','accepted')
//          AND i.from_profile::text IN ($1::text, $2::text)  -- defensive: profileId or userId
//        ORDER BY i.to_profile, i.updated_at DESC, i.created_at DESC
//        LIMIT $3 OFFSET $4
//       `,
//       [fromProfileId, meUserId, limit, offset]
//     );
//     const rows = base.rows || [];
//     if (!rows.length) {
//       return NextResponse.json({ items: [], total: 0, limit, offset }, { status: 200 });
//     }

//     // 3) join assuming to_profile is a PROFILE id (matrimony_profiles)
//     let list = await query(
//       `
//       SELECT
//         b.to_profile, b.status, b.updated_at,
//         mp.matri_id,
//         COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), mp.matri_id) AS full_name,
//         CAST(date_part('year', age(mp.dob)) AS int) AS age_years,
//         ci.name AS city_name, st.name AS state_name, co.name AS country_name,
//         pth.path AS photo_url
//       FROM (SELECT * FROM jsonb_to_recordset($1::jsonb)
//             AS x(to_profile uuid, status text, updated_at timestamptz)) b
//       JOIN matrimony_profiles mp ON mp.id = b.to_profile
//       LEFT JOIN cities ci ON ci.id = mp.city_id
//       LEFT JOIN states st ON st.id = mp.state_id
//       LEFT JOIN countries co ON co.id = mp.country_id
//       LEFT JOIN LATERAL (
//         SELECT ph.path FROM photos ph
//         WHERE ph.profile_id = mp.id
//         ORDER BY (CASE WHEN ph.is_primary THEN 1 ELSE 0 END) DESC,
//                  ph.created_at DESC, ph.id DESC
//         LIMIT 1
//       ) pth ON TRUE
//       `,
//       [JSON.stringify(rows)]
//     ).catch(() => ({ rows: [] }));

//     // 4) fallback if table name is matri_profiles
//     if (!list.rows?.length) {
//       list = await query(
//         `
//         SELECT
//           b.to_profile, b.status, b.updated_at,
//           mp.matri_id,
//           COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), mp.matri_id) AS full_name,
//           CAST(date_part('year', age(mp.dob)) AS int) AS age_years,
//           ci.name AS city_name, st.name AS state_name, co.name AS country_name,
//           pth.path AS photo_url
//         FROM (SELECT * FROM jsonb_to_recordset($1::jsonb)
//               AS x(to_profile uuid, status text, updated_at timestamptz)) b
//         JOIN matri_profiles mp ON mp.id = b.to_profile
//         LEFT JOIN cities ci ON ci.id = mp.city_id
//         LEFT JOIN states st ON st.id = mp.state_id
//         LEFT JOIN countries co ON co.id = mp.country_id
//         LEFT JOIN LATERAL (
//           SELECT ph.path FROM photos ph
//           WHERE ph.profile_id = mp.id
//           ORDER BY (CASE WHEN ph.is_primary THEN 1 ELSE 0 END) DESC,
//                    ph.created_at DESC, ph.id DESC
//           LIMIT 1
//         ) pth ON TRUE
//         `,
//         [JSON.stringify(rows)]
//       ).catch(() => ({ rows: [] }));
//     }

//     // 5) final fallback if to_profile was saved as USER id (map user -> profile)
//     if (!list.rows?.length) {
//       list = await query(
//         `
//         SELECT
//           b.to_profile, b.status, b.updated_at,
//           mp.matri_id,
//           COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), mp.matri_id) AS full_name,
//           CAST(date_part('year', age(mp.dob)) AS int) AS age_years,
//           ci.name AS city_name, st.name AS state_name, co.name AS country_name,
//           pth.path AS photo_url
//         FROM (SELECT * FROM jsonb_to_recordset($1::jsonb)
//               AS x(to_profile uuid, status text, updated_at timestamptz)) b
//         JOIN users u ON u.id = b.to_profile
//         JOIN matrimony_profiles mp ON mp.user_id = u.id
//         LEFT JOIN cities ci ON ci.id = mp.city_id
//         LEFT JOIN states st ON st.id = mp.state_id
//         LEFT JOIN countries co ON co.id = mp.country_id
//         LEFT JOIN LATERAL (
//           SELECT ph.path FROM photos ph
//           WHERE ph.profile_id = mp.id
//           ORDER BY (CASE WHEN ph.is_primary THEN 1 ELSE 0 END) DESC,
//                    ph.created_at DESC, ph.id DESC
//           LIMIT 1
//         ) pth ON TRUE
//         `,
//         [JSON.stringify(rows)]
//       ).catch(() => ({ rows: [] }));
//     }

//     return NextResponse.json(
//       { items: list.rows || [], total: list.rows?.length || 0, limit, offset },
//       { status: 200 }
//     );
//   } catch (e) {
//     console.error("[shortlist] error:", e);
//     return NextResponse.json(
//       { items: [], total: 0, limit, offset, error: "server_error" },
//       { status: 200 }
//     );
//   }
// }
// app/api/matrimoney/shortlist/route.js
// app OR src/app /api/matrimoney/shortlist/route.js
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, where: "/api/matrimoney/shortlist (app router)" }, { status: 200 });
}
                               