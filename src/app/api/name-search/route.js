// app/api/name-search/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Read JWT token from request
function readTokenFromRequest(req) {
  const tokenFromCookie =
    req.cookies.get('token')?.value ||
    req.cookies.get('auth_token')?.value ||
    req.cookies.get('auth')?.value ||
    null;

  if (tokenFromCookie) return tokenFromCookie;

  const auth =
    req.headers.get('authorization') ||
    req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();

  return null;
}

async function search({ q = "", limit = 50, page = 1, oppositeGender = null }) {
  const name = (q || "").trim().toLowerCase();
  if (!name) return { count: 0, results: [] };

  const like = `%${name}%`;
  const lim = Math.max(1, Math.min(100, Number(limit) || 50));
  const pgNum = Math.max(1, Number(page) || 1);
  const offset = (pgNum - 1) * lim;

  // Build WHERE clause with optional gender filter
  let whereClause = `
    WHERE (
      LOWER(p.first_name) LIKE $1
      OR LOWER(p.last_name)  LIKE $1
      OR LOWER(CONCAT_WS(' ', p.first_name, p.last_name)) LIKE $1
      OR LOWER(p.matri_id) LIKE $1
    )`;

  const params = [like];

  if (oppositeGender) {
    params.push(oppositeGender);
    whereClause += ` AND p.gender = $${params.length}`;
  }

  const sql = `
    WITH base AS (
      SELECT
        p.matri_id,
        TRIM(CONCAT_WS(' ', p.first_name, p.last_name))      AS full_name,
        p.first_name,
        p.last_name,
        NULL::text                                           AS photo_url,
        COALESCE(p.age_years, DATE_PART('year', age(p.dob))::int) AS age_years,
        r.name                                               AS religion_name,
        c.name                                               AS caste_name,
        NULL::text                                           AS star,
        NULL::text                                           AS raasi,
        city.name                                            AS city_name,
        st.name                                              AS state_name,
        country.name                                         AS country_name,
        NULL::text                                           AS education_name,
        NULL::text                                           AS profession,
        NULL::text                                           AS job_role,
        p.marital_status,
        p.height_cm,
        NULL::text                                           AS height_label
      FROM matrimony_profiles p
      LEFT JOIN religions  r ON r.id = p.religion_id
      LEFT JOIN castes     c ON c.id = p.caste_id
      LEFT JOIN cities     city ON city.id = p.city_id
      LEFT JOIN states     st ON st.id = p.state_id
      LEFT JOIN countries  country ON country.id = p.country_id
      ${whereClause}
    )
    SELECT
      (SELECT COUNT(*) FROM base)::int AS count,
      COALESCE(json_agg(b.*) FILTER (WHERE true), '[]') AS results
    FROM (
      SELECT * FROM base
      ORDER BY matri_id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    ) b;
  `;

  const { rows } = await query(sql, [...params, lim, offset]);
  const row = rows?.[0] || { count: 0, results: [] };
  return { count: row.count || 0, results: row.results || [] };
}

export async function GET(req) {
  try {
    // ✅ Get user's gender for filtering
    const token = readTokenFromRequest(req);
    let oppositeGender = null;

    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        const userId = decoded?.id ?? decoded?.userId;

        if (userId) {
          const userGenderQuery = `SELECT gender FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`;
          const { rows: userRows } = await query(userGenderQuery, [userId]);
          const currentUserGender = userRows?.[0]?.gender;

          if (currentUserGender) {
            oppositeGender = currentUserGender.toLowerCase() === 'male' ? 'Female' : 'Male';
          }
        }
      } catch (e) {
        // If auth fails, just don't filter by gender
        console.log('Auth check failed, proceeding without gender filter');
      }
    }

    const sp = new URL(req.url).searchParams;
    const data = await search({
      q: sp.get("q") || "",
      limit: Number(sp.get("limit")) || 50,
      page: Number(sp.get("page")) || 1,
      oppositeGender,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // ✅ Get user's gender for filtering
    const token = readTokenFromRequest(req);
    let oppositeGender = null;

    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        const userId = decoded?.id ?? decoded?.userId;

        if (userId) {
          const userGenderQuery = `SELECT gender FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`;
          const { rows: userRows } = await query(userGenderQuery, [userId]);
          const currentUserGender = userRows?.[0]?.gender;

          if (currentUserGender) {
            oppositeGender = currentUserGender.toLowerCase() === 'male' ? 'Female' : 'Male';
          }
        }
      } catch (e) {
        // If auth fails, just don't filter by gender
        console.log('Auth check failed, proceeding without gender filter');
      }
    }

    const body = await req.json().catch(() => ({}));
    const data = await search({ ...body, oppositeGender });
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
