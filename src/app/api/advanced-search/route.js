// src/app/api/advanced-search/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

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

function feetInToCm(label) {
  if (!label) return null;
  // Hardened regex: anchored and bounded to prevent super-linear runtime (ReDoS)
  // \d{1,3} bounds the digit matching, \s{0,20} bounds the whitespace matching
  const m = String(label).match(/^\s{0,20}(\d{1,2})\s{0,20}ft\.?\s{0,20}(?:(\d{1,2})\s{0,20}(?:in?\.?)?)?\s{0,20}$/i);
  if (!m) return null;
  const feet = Number(m[1] || 0);
  const inch = Number(m[2] || 0);
  return Math.round((feet * 12 + inch) * 2.54);
}

function cmToLabel(cm) {
  const n = Number(cm);
  if (!n || Number.isNaN(n)) return null;
  const total = Math.round(n / 2.54);
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return `${ft} ft ${inch} in`;
}

// normalize "uploads/abc.jpg" -> "/uploads/abc.jpg"
function safePhotoUrl(path) {
  if (!path) return null;
  const s = String(path);
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith("/") ? s : `/${s.replace(/^\/+/, "")}`;
}

export async function POST(req) {
  try {
    // ✅ Authenticate user
    const token = readTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = decoded?.id ?? decoded?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // ✅ Get current user's gender to filter for OPPOSITE gender
    const userGenderQuery = `
      SELECT gender FROM matrimony_profiles WHERE user_id = $1 LIMIT 1
    `;
    const { rows: userRows } = await query(userGenderQuery, [userId]);
    const currentUserGender = userRows?.[0]?.gender;

    if (!currentUserGender) {
      return NextResponse.json({
        error: 'Profile not found. Please complete your profile first.'
      }, { status: 404 });
    }

    // Determine opposite gender
    const oppositeGender = currentUserGender.toLowerCase() === 'male' ? 'Female' : 'Male';

    const body = await req.json().catch(() => ({}));

    const {
      // keyword: NAME ONLY (no matri id)
      q,

      // filters from Regular Search
      ageMin,
      ageMax,
      heightMinLabel,
      heightMaxLabel,
      maritalStatuses = [],
      religionId,
      motherTongueId,
      casteId,
      countryId,
      stateIds = [],
      cityId,
      educationId,

      limit = 50,
      page = 1,
    } = body || {};

    const where = [];
    const params = [];
    const add = (clause, val) => {
      params.push(val);
      where.push(clause.replace("$X", `$${params.length}`));
    };

    // ✅ CRITICAL: Filter for OPPOSITE gender only (boys see girls, girls see boys)
    add(`p.gender = $X`, oppositeGender);

    /* ----- numeric / simple filters ----- */

    // Age via DOB
    if (ageMin != null) add(`p.dob <= CURRENT_DATE - make_interval(years => $X)`, Number(ageMin));
    if (ageMax != null) add(`p.dob >= CURRENT_DATE - make_interval(years => $X)`, Number(ageMax));

    // Height
    const hMin = feetInToCm(heightMinLabel);
    const hMax = feetInToCm(heightMaxLabel);
    if (hMin != null) add(`p.height_cm >= $X`, hMin);
    if (hMax != null) add(`p.height_cm <= $X`, hMax);

    if (maritalStatuses?.length) add(`p.marital_status = ANY($X)`, maritalStatuses);
    if (religionId) add(`p.religion_id = $X`, Number(religionId));
    if (motherTongueId) add(`p.mother_tongue_id = $X`, Number(motherTongueId));
    if (casteId) add(`p.caste_id = $X`, Number(casteId));
    if (countryId) add(`p.country_id = $X`, Number(countryId));
    if (stateIds?.length) add(`p.state_id = ANY($X)`, stateIds.map(Number));
    if (cityId) add(`p.city_id = $X`, Number(cityId));
    if (educationId) add(`p.education_id = $X`, Number(educationId));

    /* ----- NAME-ONLY keyword search ----- */
    const term = (q || "").trim();
    if (term) {
      // reuse one placeholder for all LIKEs
      params.push(`%${term}%`);
      const like = `$${params.length}`;

      where.push(`(
        (COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) ILIKE ${like}
        OR p.first_name ILIKE ${like}
        OR p.last_name  ILIKE ${like}
      )`);

      for (const t of term.split(/\s+/).filter(Boolean)) {
        params.push(`%${t}%`);
        const tk = `$${params.length}`;
        where.push(`(p.first_name ILIKE ${tk} OR p.last_name ILIKE ${tk})`);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * pageSize;

    /* ----- count ----- */
    const countSql = `SELECT COUNT(*)::int AS n FROM matrimony_profiles p ${whereSql}`;
    const { rows: cRows } = await query(countSql, params);
    const total = cRows?.[0]?.n ?? 0;

    /* ----- data + master joins + robust photo fetch ----- */
    const sql = `
      SELECT
        p.id, p.user_id, p.matri_id, p.gender,
        p.first_name, p.last_name,
        TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) AS full_name,
        p.dob,
        FLOOR(EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.dob)))::int AS age_years,
        p.height_cm, p.marital_status,
        p.religion_id, rel.name AS religion_name,
        p.caste_id,    ca.name  AS caste_name,
        p.country_id,  co.name  AS country_name,
        p.state_id,    st.name  AS state_name,
        p.city_id,     ci.name  AS city_name,
        p.education_id, ed.name AS education_name,
        l.name  AS mother_tongue_name,
        ph.path AS photo_path
      FROM matrimony_profiles p
      LEFT JOIN religions  rel ON rel.id = p.religion_id
      LEFT JOIN castes     ca  ON ca.id  = p.caste_id
      LEFT JOIN countries  co  ON co.id  = p.country_id
      LEFT JOIN states     st  ON st.id  = p.state_id
      LEFT JOIN cities     ci  ON ci.id  = p.city_id
      LEFT JOIN educations ed  ON ed.id  = p.education_id
      LEFT JOIN languages  l   ON l.id   = p.mother_tongue_id
      LEFT JOIN LATERAL (
        SELECT path
        FROM photos ph1
        WHERE ph1.profile_id::text = p.id::text
        ORDER BY ph1.is_primary DESC NULLS LAST, ph1.created_at DESC NULLS LAST
        LIMIT 1
      ) ph ON TRUE
      ${whereSql}
      ORDER BY p.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const { rows } = await query(sql, [...params, pageSize, offset]);

    const results = rows.map((r) => ({
      ...r,
      photo_url: safePhotoUrl(r.photo_path),
      height_label: r.height_cm ? cmToLabel(r.height_cm) : null,
      location_text: [r.city_name, r.state_name, r.country_name]
        .filter(Boolean)
        .join(", "),
    }));

    return NextResponse.json({
      page: pageNum,
      limit: pageSize,
      count: total,
      results,
    });
  } catch (err) {
    console.error("advanced-search error:", err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
