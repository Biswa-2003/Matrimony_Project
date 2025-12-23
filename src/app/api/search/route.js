export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";

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

// Helper: "5ft 7in" -> centimeters
function feetInchesToCm(label) {
    if (!label) return null;
    const s = String(label).trim();
    // Improved anchored regex
    const m =
        s.match(/^\s{0,20}(\d{1,2})\s{0,20}ft\.?\s{0,20}(?:(\d{1,2})\s{0,20}(?:in?\.?)?)?\s{0,20}$/i) ||
        s.match(/^\s{0,20}(\d{1,2})\s{0,20}ft\s{0,20}$/i);
    if (!m) return null;
    const ft = parseInt(m[1] || "0", 10);
    const inches = parseInt(m[2] || "0", 10);
    return Math.round((ft * 12 + inches) * 2.54);
}

/**
 * GET handler for simple ID search e.g. /api/search?matriId=DU123
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const matriId = searchParams.get("matriId");

    if (!matriId) {
        return NextResponse.json({ results: [] });
    }

    // ✅ Get user's gender for filtering
    const token = readTokenFromRequest(req);
    let genderClause = "";
    const genderParams = [];

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
                    const oppositeGender = currentUserGender.toLowerCase() === 'male' ? 'Female' : 'Male';
                    genderClause = " AND mp.gender = $2";
                    genderParams.push(oppositeGender);
                }
            }
        } catch (e) {
            console.log('Auth check failed, proceeding without gender filter');
        }
    }

    const sql = `
    SELECT
      mp.id,
      mp.matri_id,
      mp.first_name,
      mp.last_name,
      DATE_PART('year', AGE(mp.dob))::int AS age,
      mp.height_cm,
      r.name  AS religion,
      c.name  AS caste,
      co.name AS country,
      st.name AS state,
      ci.name AS city,
      ph.path AS photo_url
    FROM matrimony_profiles mp
    LEFT JOIN religions r  ON r.id  = mp.religion_id
    LEFT JOIN castes c     ON c.id  = mp.caste_id
    LEFT JOIN countries co ON co.id = mp.country_id
    LEFT JOIN states st    ON st.id = mp.state_id
    LEFT JOIN cities ci    ON ci.id = mp.city_id
    LEFT JOIN LATERAL (
      SELECT path FROM photos WHERE profile_id = mp.id AND is_primary = true LIMIT 1
    ) ph ON true
    WHERE LOWER(mp.matri_id) = LOWER($1)${genderClause}
    LIMIT 1;
  `;

    try {
        const { rows } = await query(sql, [matriId.trim(), ...genderParams]);

        // Transform to match what the UI expects
        const results = rows.map((r) => ({
            id: r.id,
            matri_id: r.matri_id,
            name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.matri_id,
            age: r.age,
            height_cm: r.height_cm,
            location: { city: r.city, state: r.state, country: r.country },
            photo: r.photo_url,
            religion: r.religion,
            caste: r.caste
        }));

        // If "ResultsPage" checks "user" or "users"
        return NextResponse.json({ results: results, user: results[0] });
    } catch (e) {
        console.error("Search API Error:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * Helper to conditionally add WHERE clauses
 */
function addWhere(where, params, value, clauseBuilder) {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
        return;
    }
    const placeholders = clauseBuilder(params.length + 1); // next $ index
    where.push(placeholders.clause);
    params.push(...placeholders.values(value));
}

/**
 * POST handler for Advanced Search
 */
export async function POST(req) {
    const b = await req.json();

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
            console.log('Auth check failed, proceeding without gender filter');
        }
    }

    // ---- normalize inputs
    let minAge = Number(b.ageMin ?? 18);
    let maxAge = Number(b.ageMax ?? 70);
    if (minAge > maxAge) [minAge, maxAge] = [maxAge, minAge];

    const minH = b.heightMinLabel ? feetInchesToCm(b.heightMinLabel) : null;
    const maxH = b.heightMaxLabel ? feetInchesToCm(b.heightMaxLabel) : null;

    const pageSize = Math.max(1, Math.min(Number(b.limit ?? 12), 50));
    const page = Math.max(1, Number(b.page ?? 1));
    const offset = (page - 1) * pageSize;

    const marital = Array.isArray(b.maritalStatuses) ? b.maritalStatuses : [];
    const stateIds = Array.isArray(b.stateIds) ? b.stateIds : [];

    // ---- dynamic WHERE
    const where = ["mp.is_active = true"];
    const params = [];

    // ✅ CRITICAL: Add opposite gender filter
    if (oppositeGender) {
        where.push(`mp.gender = $${params.length + 1}`);
        params.push(oppositeGender);
    }

    // Age (always)
    where.push(`DATE_PART('year', AGE(mp.dob)) BETWEEN $1 AND $2`);
    params.push(minAge, maxAge);

    // Height
    if (minH != null && maxH != null) {
        where.push(`mp.height_cm BETWEEN $${params.length + 1} AND $${params.length + 2}`);
        params.push(minH, maxH);
    }

    addWhere(where, params, marital, (idx) => ({
        clause: `mp.marital_status = ANY($${idx})`,
        values: (v) => [v],
    }));

    addWhere(where, params, b.religionId, (idx) => ({
        clause: `mp.religion_id = $${idx}`,
        values: (v) => [v],
    }));

    addWhere(where, params, b.motherTongueId, (idx) => ({
        clause: `mp.mother_tongue_id = $${idx}`,
        values: (v) => [v],
    }));

    addWhere(where, params, b.casteId, (idx) => ({
        clause: `mp.caste_id = $${idx}`,
        values: (v) => [v],
    }));

    addWhere(where, params, b.countryId, (idx) => ({
        clause: `mp.country_id = $${idx}`,
        values: (v) => [v],
    }));

    addWhere(where, params, stateIds, (idx) => ({
        clause: `mp.state_id = ANY($${idx})`,
        values: (v) => [v],
    }));

    addWhere(where, params, b.cityId, (idx) => ({
        clause: `mp.city_id = $${idx}`,
        values: (v) => [v],
    }));

    addWhere(where, params, b.educationId, (idx) => ({
        clause: `mp.education_id = $${idx}`,
        values: (v) => [v],
    }));

    // pagination placeholders
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const sql = `
    SELECT
      mp.id,
      mp.matri_id,
      mp.first_name,
      mp.last_name,
      DATE_PART('year', AGE(mp.dob))::int AS age,
      mp.height_cm,
      r.name  AS religion,
      c.name  AS caste,
      co.name AS country,
      st.name AS state,
      ci.name AS city,
      ph.path AS photo_url,
      COUNT(*) OVER() AS total
    FROM matrimony_profiles mp
    LEFT JOIN religions r  ON r.id  = mp.religion_id
    LEFT JOIN castes c     ON c.id  = mp.caste_id
    LEFT JOIN countries co ON co.id = mp.country_id
    LEFT JOIN states st    ON st.id = mp.state_id
    LEFT JOIN cities ci    ON ci.id = mp.city_id
    LEFT JOIN LATERAL (
      SELECT path FROM photos WHERE profile_id = mp.id AND is_primary = true LIMIT 1
    ) ph ON true
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY mp.updated_at DESC NULLS LAST, mp.id DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

    params.push(pageSize, offset);

    try {
        const { rows } = await query(sql, params);
        const total = rows[0]?.total ? Number(rows[0].total) : 0;

        const results = rows.map((r) => ({
            id: r.id,
            matri_id: r.matri_id,
            name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.matri_id,
            age: r.age,
            height_cm: r.height_cm,
            religion: r.religion,
            caste: r.caste,
            location: { city: r.city, state: r.state, country: r.country },
            city: r.city,
            state: r.state,
            photo_url: r.photo_url
        }));

        return NextResponse.json({
            page,
            limit: pageSize,
            total,
            results
        });
    } catch (e) {
        console.error("Advanced Search API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
