// app/api/matches/_common.js
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/** Keep 0 while match_score() is being finalized */
export const SCORE_MIN = 0;

/* ---------------------------- small helpers ---------------------------- */
function spanToInterval(span) {
  if (span === "day") return "1 day";
  if (span === "week") return "7 days";
  if (span === "month") return "30 days";
  return null;
}

const num = (v, d, lo, hi) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

/* --------------------------- builder + queries -------------------------- */
export async function buildCommonParts(meId, sp) {
  // ✅ Get current user's gender to filter for opposite gender
  let oppositeGender = null;
  if (meId) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT gender FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`,
        [meId]
      );
      const currentUserGender = rows?.[0]?.gender;
      if (currentUserGender) {
        oppositeGender = currentUserGender.toLowerCase() === 'male' ? 'Female' : 'Male';
      }
    } finally {
      client.release();
    }
  }

  // optional client-side filters
  const createdWithin = spanToInterval(sp.get("createdWithin"));
  const activeWithin = spanToInterval(sp.get("activeWithin")); // kept but made safe
  const sort = sp.get("sort") || "newest"; // default: newest

  // age window (safe defaults)
  let ageMin = num(sp.get("ageMin"), 18, 18, 90);
  let ageMax = num(sp.get("ageMax"), 99, 18, 90);
  if (ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin];

  // paging
  const page = num(sp.get("page"), 1, 1, 10000);
  const limit = num(sp.get("limit"), 20, 1, 50);
  const offset = (page - 1) * limit;

  // FROM and base WHERE
  const from = `
    users u
    JOIN matrimony_profiles mp ON mp.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT path FROM photos ph 
      WHERE ph.profile_id = mp.id 
      ORDER BY ph.is_primary DESC, ph.created_at DESC 
      LIMIT 1
    ) ph ON TRUE
  `;

  // IMPORTANT: we intentionally do NOT reference u.is_blocked or mp.is_hidden
  // because those columns do not exist in your DB (yet).
  const whereParts = [`u.id <> $1`];
  const params = [meId];

  // ✅ CRITICAL: Filter for OPPOSITE gender only (boys see girls, girls see boys)
  if (oppositeGender) {
    params.push(oppositeGender);
    whereParts.push(`mp.gender = $${params.length}`);
  }

  // Age by DOB (no mp.age_years column needed)
  params.push(ageMin, ageMax);
  const ageParamStart = params.length - 1;
  whereParts.push(`CAST(date_part('year', age(mp.dob)) AS int) BETWEEN $${ageParamStart} AND $${ageParamStart + 1}`);

  // Time windows (safe defaults)
  const createdExpr = `COALESCE(mp.updated_at, mp.created_at, u.created_at, NOW())`;
  if (createdWithin) whereParts.push(`${createdExpr} >= NOW() - INTERVAL '${createdWithin}'`);

  // We don't rely on u.last_seen (may not exist). If activeWithin is set, fallback to createdExpr.
  if (activeWithin) whereParts.push(`${createdExpr} >= NOW() - INTERVAL '${activeWithin}'`);

  // Sorting (no u.last_seen; "relevance" only if your function exists)
  const ageExpr = `CAST(date_part('year', age(mp.dob)) AS int)`;
  let orderBy;

  switch (sort) {
    case "age_asc":
      orderBy = `${ageExpr} ASC, ${createdExpr} DESC`;
      break;
    case "age_desc":
      orderBy = `${ageExpr} DESC, ${createdExpr} DESC`;
      break;
    case "newest":
    case "relevance":
    default:
      orderBy = `${createdExpr} DESC`;
      break;
  }

  // Return both 'where' (for legacy/consumers) and 'whereParts' (for correctness)
  return {
    from,
    where: whereParts,
    whereParts,
    params,
    page,
    limit,
    offset,
    createdExpr,
    orderBy,
  };
}

export async function runCountQuery({ from, whereParts = [], params = [] }) {
  const client = await pool.connect();
  try {
    const sql = `
      SELECT COUNT(*)::int AS count
      FROM ${from}
      WHERE ${whereParts.length ? whereParts.join(" AND ") : "TRUE"}
    `;
    const { rows } = await client.query(sql, params);
    return rows?.[0]?.count || 0;
  } finally {
    client.release();
  }
}

/**
 * runListQuery
 * - Keeps selection minimal and SAFE for your current schema
 * - No u.username or u.last_seen. Name is built from first/last available
 */
export async function runListQuery({
  from,
  whereParts = [],
  params = [],
  limit,
  offset,
  orderBy,
  additionalSelect = "",
}) {
  const client = await pool.connect();
  try {
    const extra = additionalSelect?.trim() ? `, ${additionalSelect.trim()}` : "";

    const sql = `
      SELECT
        u.id                           AS user_id,
        u.email,
        -- display name built safely from either profile or users table
        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''),
          NULLIF(BTRIM(CONCAT_WS(' ', u.first_name,  u.last_name )), ''),
          mp.matri_id
        ) AS full_name,
        ph.path AS photo,
        mp.matri_id,
        mp.gender,
        CAST(date_part('year', age(mp.dob)) AS int) AS age_years,
        /* safe score usage */
        0 as score
        ${extra}
      FROM ${from}
      WHERE ${whereParts.length ? whereParts.join(" AND ") : "TRUE"}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const { rows } = await client.query(sql, params);
    return rows || [];
  } finally {
    client.release();
  }
}

/** 
 * Duplication Prevention Helpers for SonarQube
 */

// Normalize whereParts coming from older/newer common builders
export function normalizeWhereParts(base) {
  if (Array.isArray(base.whereParts)) return base.whereParts;
  if (Array.isArray(base.where)) return base.where;
  return [];
}

// Standard handler for count/list pattern to avoid duplication in routes
export async function respondCountOrList({ sp, base, whereParts }) {
  if (sp.get("count") === "1") {
    const count = await runCountQuery({
      from: base.from,
      whereParts,
      params: base.params,
    });
    return NextResponse.json({ ok: true, count });
  }

  const results = await runListQuery({
    from: base.from,
    whereParts,
    params: base.params,
    limit: base.limit,
    offset: base.offset,
    orderBy: base.orderBy,
  });

  return NextResponse.json({ ok: true, page: base.page, limit: base.limit, results });
}
