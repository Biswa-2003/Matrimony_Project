// app/api/matrimoney/profile-details/[matri_id]/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- auth helper ---------------- */
async function getUserIdFromCookie() {
  const c = await cookies();
  const token =
    c.get("token")?.value ||
    c.get("auth_token")?.value ||
    c.get("auth")?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const d = jwt.verify(token, secret);
    return d?.id ?? d?.userId ?? null; // user id in JWT
  } catch {
    return null;
  }
}

/* ---------------- GET /api/matrimoney/profile-details/[matri_id] ---------------- */
export async function GET(req, { params }) {
  const { matri_id } = params || {};
  const id = String(matri_id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "matri_id is required" }, { status: 400 });
  }

  const sp = new URL(req.url).searchParams;
  const withInterest = sp.get("withInterest") === "1";
  const diag = sp.get("diag") === "1";

  // 1) Minimal existence check (no joins)
  const exists = await query(
    `
    SELECT id, user_id, matri_id
      FROM matrimony_profiles
     WHERE LOWER(matri_id) = LOWER($1)
     LIMIT 1
    `,
    [id]
  );

  try {
    const db = await query("select current_database() as db");
    console.log(
      "[profile-details] DB:",
      db.rows?.[0]?.db,
      "matri_id:",
      id,
      "exists:",
      exists.rowCount
    );
  } catch {}

  if (diag) {
    return NextResponse.json({
      matri_id: id,
      exists_count: exists.rowCount,
      exists_row: exists.rows?.[0] || null,
    });
  }

  if (!exists.rowCount) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const base = exists.rows[0];

  // 2) Full details via LEFT JOINs (safe even if lookups missing)
  const details = await query(
    `
    SELECT
      mp.id AS profile_id,
      mp.user_id AS profile_user_id,
      mp.matri_id,
      COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), mp.matri_id) AS full_name,
      mp.gender, mp.marital_status, mp.dob,
      CAST(date_part('year', age(mp.dob)) AS int) AS age_years,
      mp.height_cm, mp.weight_kg,
      r.name  AS religion_name,
      c.name  AS caste_name,
      ci.name AS city_name,
      st.name AS state_name,
      co.name AS country_name,
      pth.path AS photo_url,
      mp.about_me,
      mp.about_family,
      to_jsonb(mp) AS mp_json
    FROM matrimony_profiles mp
    LEFT JOIN users u       ON u.id  = mp.user_id
    LEFT JOIN religions r   ON r.id  = mp.religion_id
    LEFT JOIN castes c      ON c.id  = mp.caste_id
    LEFT JOIN cities ci     ON ci.id = mp.city_id
    LEFT JOIN states st     ON st.id = mp.state_id
    LEFT JOIN countries co  ON co.id = mp.country_id
    LEFT JOIN LATERAL (
      SELECT ph.path
        FROM photos ph
       WHERE ph.profile_id = mp.id
       ORDER BY
         CASE WHEN ph.is_primary THEN 1 ELSE 0 END DESC,
         ph.created_at DESC,
         ph.id DESC
       LIMIT 1
    ) pth ON TRUE
    WHERE mp.id = $1
    LIMIT 1
    `,
    [base.id]
  );

  const row =
    details.rows?.[0] || {
      // Fallback minimal payload
      matri_id: base.matri_id,
      full_name: base.matri_id,
      gender: null,
      marital_status: null,
      dob: null,
      age_years: null,
      height_cm: null,
      weight_kg: null,
      religion_name: null,
      caste_name: null,
      city_name: null,
      state_name: null,
      country_name: null,
      photo_url: null,
      about_me: null,
      about_family: null,
      mp_json: null,
      profile_user_id: base.user_id,
      profile_id: base.id,
    };

  // If the client did not ask for interest, return public fields now
  if (!withInterest) {
    const { profile_user_id, profile_id, ...publicFields } = row;
    return NextResponse.json(publicFields, { status: 200 });
  }

  // 3) Interest block — use PROFILE IDs, not USER IDs
  const meUserId = await getUserIdFromCookie();
  const interest = {
    me_to_them: null,
    them_to_me: null,
    is_self: false,
    is_mutual_sent: false,
    is_accepted_by_them: false,
    is_accepted_mutual: false,
  };

  if (meUserId && row.profile_id) {
    // Map viewer user -> viewer profile
    const vp = await query(
      `SELECT id FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`,
      [meUserId]
    );
    const viewerProfileId = vp.rows?.[0]?.id || null;

    if (viewerProfileId) {
      interest.is_self = String(viewerProfileId) === String(row.profile_id);

      if (!interest.is_self) {
        // me -> them
        const q1 = await query(
          `
          SELECT status, updated_at
            FROM interests
           WHERE from_profile = $1 AND to_profile = $2
           ORDER BY updated_at DESC, created_at DESC
           LIMIT 1
          `,
          [viewerProfileId, row.profile_id]
        );
        if (q1.rows[0]) interest.me_to_them = q1.rows[0];

        // them -> me
        const q2 = await query(
          `
          SELECT status, updated_at
            FROM interests
           WHERE from_profile = $1 AND to_profile = $2
           ORDER BY updated_at DESC, created_at DESC
           LIMIT 1
          `,
          [row.profile_id, viewerProfileId]
        );
        if (q2.rows[0]) interest.them_to_me = q2.rows[0];

        const my = interest.me_to_them?.status || null;
        const th = interest.them_to_me?.status || null;

        interest.is_mutual_sent      = !!(my && th);
        interest.is_accepted_by_them = my === "sent"     && th === "accepted";
        interest.is_accepted_mutual  = my === "accepted" && th === "accepted";
      }
    }
  }

  const { profile_user_id, profile_id, ...publicFields } = row;
  return NextResponse.json({ ...publicFields, interest }, { status: 200 });
}
