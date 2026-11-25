// src/app/api/advanced-search/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, notBlockedSql } from "@/lib/schema";

export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */
function feetInToCm(label) {
  if (!label) return null;
  const m = String(label).match(/^\s{0,20}(\d{1,2})\s{0,20}ft\.?\s{0,20}(?:(\d{1,2})\s{0,20}(?:in?\.?)?)?\s{0,20}$/i);
  if (!m) return null;
  return Math.round((Number(m[1] || 0) * 12 + Number(m[2] || 0)) * 2.54);
}
const cmToLabel = (cm) => {
  const n = Number(cm);
  if (!n) return null;
  const t = Math.round(n / 2.54);
  return `${Math.floor(t / 12)}ft ${t % 12}in`;
};
const photoUrl = (p) => {
  if (!p) return null;
  const s = String(p);
  if (/^(https?:|data:)/i.test(s)) return s;
  if (s.startsWith("/")) return s;
  return s.startsWith("uploads/") ? `/${s}` : `/uploads/${s}`;
};
const ids = (v) => (Array.isArray(v) ? v : v != null && v !== "" ? [v] : []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
const strs = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(String).filter(Boolean);

// Stored data is inconsistent ("Unmarried" vs "Never Married", "Veg" vs "Vegetarian"), so each
// filter option maps to every raw value that means the same thing.
const MARITAL = {
  "Never Married": ["never married", "unmarried", "single"],
  Divorced: ["divorced"],
  Widowed: ["widowed", "widow", "widower"],
  "Awaiting Divorce": ["awaiting divorce"],
};
const DIET = {
  Vegetarian: ["veg", "vegetarian", "pure veg", "pure vegetarian"],
  "Non-Vegetarian": ["non-veg", "non veg", "non-vegetarian", "nonveg", "non-veg and veg"],
  Eggetarian: ["eggetarian", "egg", "eggitarian"],
  Vegan: ["vegan"],
};

const SORTS = {
  newest: "p.created_at DESC NULLS LAST, p.id DESC",
  updated: "COALESCE(p.updated_at, p.created_at) DESC NULLS LAST",
  age_asc: "p.dob DESC NULLS LAST",
  age_desc: "p.dob ASC NULLS LAST",
  height_desc: "p.height_cm DESC NULLS LAST",
};

/**
 * POST — rich partner search.
 * Body (all optional): q, ageMin, ageMax, heightMinCm|heightMinLabel, heightMaxCm|heightMaxLabel,
 *   maritalStatuses[], religionIds[] (or religionId), casteIds[] (or casteId), motherTongueIds[] (or motherTongueId),
 *   countryId, stateIds[], cityIds[] (or cityId), educationIds[] (or educationId), professionIds[], incomeMin,
 *   diets[], withPhoto, verifiedOnly, joinedWithinDays, sort, page, limit
 * Always excludes: own gender, yourself, deactivated profiles, and members blocked either way.
 */
export async function POST(req) {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Please log in to search." }, { status: 401 });

  try {
    await ensureSchema().catch(() => {});
    const me = (await query(`SELECT gender FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`, [userId])).rows[0];
    if (!me?.gender) {
      return NextResponse.json({ error: "Please complete your profile before searching." }, { status: 404 });
    }
    const oppositeGender = me.gender.toLowerCase() === "male" ? "Female" : "Male";

    const b = (await req.json().catch(() => ({}))) || {};
    const where = [];
    const params = [];
    const add = (clause, val) => {
      params.push(val);
      where.push(clause.replaceAll("$X", `$${params.length}`));
    };

    add(`p.gender = $X`, oppositeGender);
    add(`p.user_id <> $X`, userId);
    where.push(`COALESCE(p.is_active, TRUE) = TRUE`);
    where.push(notBlockedSql(`$2`, "p.user_id"));

    // age / height
    const ageMin = Number(b.ageMin), ageMax = Number(b.ageMax);
    if (ageMin >= 18) add(`p.dob <= CURRENT_DATE - make_interval(years => $X)`, ageMin);
    if (ageMax >= 18 && ageMax < 100) add(`p.dob > CURRENT_DATE - make_interval(years => $X)`, ageMax + 1);
    const hMin = Number(b.heightMinCm) || feetInToCm(b.heightMinLabel);
    const hMax = Number(b.heightMaxCm) || feetInToCm(b.heightMaxLabel);
    if (hMin && hMin > 130) add(`p.height_cm >= $X`, hMin);
    if (hMax && hMax < 215) add(`p.height_cm <= $X`, hMax);

    // categorical
    const marital = strs(b.maritalStatuses).flatMap((m) => MARITAL[m] || [m.toLowerCase()]);
    if (marital.length) add(`LOWER(TRIM(p.marital_status)) = ANY($X)`, marital);
    const diets = strs(b.diets).flatMap((d) => DIET[d] || [d.toLowerCase()]);
    if (diets.length) add(`LOWER(TRIM(p.diet)) = ANY($X)`, diets);

    const listFilter = (col, value) => {
      const v = ids(value);
      if (v.length) add(`${col} = ANY($X)`, v);
    };
    listFilter("p.religion_id", b.religionIds ?? b.religionId);
    listFilter("p.caste_id", b.casteIds ?? b.casteId);
    listFilter("p.mother_tongue_id", b.motherTongueIds ?? b.motherTongueId);
    listFilter("p.country_id", b.countryId);
    listFilter("p.state_id", b.stateIds);
    listFilter("p.city_id", b.cityIds ?? b.cityId);
    listFilter("p.education_id", b.educationIds ?? b.educationId);
    listFilter("p.profession_id", b.professionIds);

    if (Number(b.incomeMin) > 0) add(`p.annual_income_inr >= $X`, Number(b.incomeMin));
    if (b.verifiedOnly) where.push(`COALESCE(p.is_verified, FALSE) = TRUE`);
    if (b.withPhoto) where.push(`EXISTS (SELECT 1 FROM photos phx WHERE phx.profile_id = p.id)`);
    if (Number(b.joinedWithinDays) > 0) add(`p.created_at >= NOW() - make_interval(days => $X)`, Number(b.joinedWithinDays));

    // name keyword
    const term = String(b.q || "").trim().slice(0, 60);
    if (term) {
      for (const t of term.split(/\s+/).filter(Boolean).slice(0, 4)) {
        add(`(p.first_name ILIKE $X OR p.last_name ILIKE $X)`, `%${t}%`);
      }
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const pageNum = Math.max(1, Number(b.page) || 1);
    const pageSize = Math.min(48, Math.max(1, Number(b.limit) || 24));
    const offset = (pageNum - 1) * pageSize;
    const orderBy = SORTS[b.sort] || SORTS.newest;

    const [countRes, rowsRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS n FROM matrimony_profiles p ${whereSql}`, params),
      query(
        `SELECT
           p.id, p.user_id, p.matri_id, p.gender,
           TRIM(CONCAT_WS(' ', p.first_name, p.last_name)) AS full_name,
           FLOOR(EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.dob)))::int AS age_years,
           p.height_cm, p.marital_status, p.diet, p.created_at,
           COALESCE(p.is_verified, FALSE) AS is_verified,
           COALESCE(p.photo_locked, FALSE) AS photo_locked,
           rel.name AS religion_name, ca.name AS caste_name, co.name AS country_name,
           st.name AS state_name, ci.name AS city_name, ed.name AS education_name,
           pr.name AS profession_name, l.name AS mother_tongue_name,
           ph.path AS photo_path,
           EXISTS (SELECT 1 FROM shortlists s WHERE s.user_id = $2 AND s.target_user_id = p.user_id) AS shortlisted,
           (SELECT i.status FROM interests i
             WHERE (i.from_profile = $2 AND i.to_profile = p.user_id) OR (i.from_profile = p.user_id AND i.to_profile = $2)
             ORDER BY i.updated_at DESC LIMIT 1) AS interest_status
         FROM matrimony_profiles p
         LEFT JOIN religions rel ON rel.id = p.religion_id
         LEFT JOIN castes ca ON ca.id = p.caste_id
         LEFT JOIN countries co ON co.id = p.country_id
         LEFT JOIN states st ON st.id = p.state_id
         LEFT JOIN cities ci ON ci.id = p.city_id
         LEFT JOIN educations ed ON ed.id = p.education_id
         LEFT JOIN professions pr ON pr.id = p.profession_id
         LEFT JOIN languages l ON l.id = p.mother_tongue_id
         LEFT JOIN LATERAL (
           SELECT path FROM photos ph1 WHERE ph1.profile_id = p.id
           ORDER BY ph1.is_primary DESC NULLS LAST, ph1.created_at DESC NULLS LAST LIMIT 1
         ) ph ON TRUE
         ${whereSql}
         ORDER BY ${orderBy}
         LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);

    const total = countRes.rows[0]?.n ?? 0;
    const results = rowsRes.rows.map((r) => ({
      ...r,
      photo_url: photoUrl(r.photo_path),
      height_label: cmToLabel(r.height_cm),
      location_text: [r.city_name, r.state_name, r.country_name].filter(Boolean).join(", "),
      is_new: r.created_at && Date.now() - new Date(r.created_at).getTime() < 14 * 864e5,
    }));

    return NextResponse.json({ page: pageNum, limit: pageSize, count: total, hasMore: offset + results.length < total, results });
  } catch (err) {
    console.error("advanced-search error:", err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
