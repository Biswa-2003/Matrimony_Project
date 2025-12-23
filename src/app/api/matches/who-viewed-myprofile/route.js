import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getUserId() {
  const c = await cookies();
  const token =
    c.get("token")?.value || c.get("auth_token")?.value || c.get("auth")?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    return d?.id ?? d?.userId ?? null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  const meId = await getUserId();
  if (!meId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const onlyCount = sp.get("count") === "1";

  // count of people who viewed my profile
  const countSql = `
    SELECT COUNT(DISTINCT v.viewer_id) AS total
    FROM profile_views v
    WHERE v.viewed_id = $1
  `;
  const { rows: cRows } = await query(countSql, [meId]);
  const total = Number(cRows?.[0]?.total || 0);

  // if dashboard only needs count
  if (onlyCount) {
    return NextResponse.json({ ok: true, total });
  }

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(50, parseInt(sp.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  const listSql = `
    SELECT
      v.*,
      p.matri_id,
      COALESCE(p.first_name,'') AS first_name,
      COALESCE(p.last_name,'') AS last_name,
      p.gender,
      p.marital_status,
      p.height_cm,
      p.star,
      p.rashi,
      ph.path AS photo,
      CAST(date_part('year', age(p.dob)) AS int) AS age_years,
      ci.name AS city_name,
      st.name AS state_name,
      co.name AS country_name,
      r.name AS religion_name,
      c.name AS caste_name,
      edu.name AS education_name,
      prof.name AS profession_name
    FROM profile_views v
    JOIN matrimony_profiles p ON p.user_id = v.viewer_id
    LEFT JOIN cities ci ON ci.id = p.city_id
    LEFT JOIN states st ON st.id = p.state_id
    LEFT JOIN countries co ON co.id = p.country_id
    LEFT JOIN religions r ON r.id = p.religion_id
    LEFT JOIN castes c ON c.id = p.caste_id
    LEFT JOIN educations edu ON edu.id = p.education_id
    LEFT JOIN professions prof ON prof.id = p.profession_id
    LEFT JOIN LATERAL (
      SELECT path FROM photos ph 
      WHERE ph.profile_id = p.id 
      ORDER BY ph.is_primary DESC, ph.created_at DESC 
      LIMIT 1
    ) ph ON TRUE
    WHERE v.viewed_id = $1
    ORDER BY v.viewed_at DESC
    LIMIT $2 OFFSET $3
  `;

  const { rows } = await query(listSql, [meId, limit, offset]);

  return NextResponse.json({
    ok: true,
    results: rows,
    total,
    page,
    limit,
  });
}
