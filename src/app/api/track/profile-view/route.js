// src/app/api/profile-views/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- auth helper ---------- */
async function getUserId() {
  const c = await cookies();
  const token =
    c.get("token")?.value || c.get("auth_token")?.value || c.get("auth")?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    return d?.id ?? d?.userId ?? null; // users.id
  } catch {
    return null;
  }
}

/* ====================================================
   GET /api/profile-views
   -> list / count of people who viewed *my* profile
   ?count=1 => only count
==================================================== */
export async function GET(req) {
  const meId = await getUserId();
  if (!meId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const onlyCount = sp.get("count") === "1";

  // total number of people who viewed my profile
  const countSql = `
    SELECT COUNT(*) AS total
    FROM profile_views v
    WHERE v.viewed_id = $1
  `;
  const { rows: cRows } = await query(countSql, [meId]);
  const total = Number(cRows?.[0]?.total || 0);

  if (onlyCount) {
    return NextResponse.json({ ok: true, total });
  }

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(50, parseInt(sp.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  // detailed viewer list
  const listSql = `
    SELECT
      v.viewed_at,
      v.viewer_id,
      v.viewed_id,
      p.id              AS profile_id,
      p.matri_id,
      COALESCE(p.first_name,'') AS first_name,
      COALESCE(p.last_name,'')  AS last_name,
      p.gender,
      p.height_cm,
      p.age_years,
      p.city_name,
      p.state_name,
      p.country_name,
      p.photo_path
    FROM profile_views v
    JOIN matrimony_profiles p
      ON p.user_id = v.viewer_id           -- 👈 very important: viewer_id = users.id
    WHERE v.viewed_id = $1                 -- and viewed_id = users.id
    ORDER BY v.viewed_at DESC
    LIMIT $2 OFFSET $3
  `;

  const { rows } = await query(listSql, [meId, limit, offset]);

  // normalize photo URL (optional)
  const results = rows.map((r) => ({
    ...r,
    full_name: `${r.first_name} ${r.last_name}`.trim(),
    photo_url: r.photo_path
      ? r.photo_path.startsWith("http")
        ? r.photo_path
        : r.photo_path.startsWith("/")
        ? r.photo_path
        : `/${r.photo_path.replace(/^\/+/, "")}`
      : null,
    location_text: [r.city_name, r.state_name, r.country_name]
      .filter(Boolean)
      .join(", "),
  }));

  return NextResponse.json({
    ok: true,
    results,
    total,
    page,
    limit,
  });
}

/* ====================================================
   POST /api/profile-views
   -> log that I viewed someone else’s profile
   Body: { viewed_user_id: "<users.id of that profile>" }
==================================================== */
export async function POST(req) {
  const meId = await getUserId();
  if (!meId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  let { viewed_user_id } = body;

  // backwards compat (if you were sending viewed_id)
  if (!viewed_user_id && body.viewed_id) {
    viewed_user_id = body.viewed_id;
  }

  if (!viewed_user_id) {
    return NextResponse.json(
      { ok: false, error: "Missing viewed_user_id" },
      { status: 400 }
    );
  }

  if (viewed_user_id === meId) {
    // don't log self views
    return NextResponse.json({ ok: true, skipped: true });
  }

  await query(
    `
      INSERT INTO profile_views (viewer_id, viewed_id)
      VALUES ($1, $2)
      ON CONFLICT (viewer_id, viewed_id) DO NOTHING
    `,
    [meId, viewed_user_id]
  );

  return NextResponse.json({ ok: true });
}
