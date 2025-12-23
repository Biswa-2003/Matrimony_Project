// /app/api/my-home/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

/** DU + 6 digits, zero-padded (e.g., DU000123) */
function genMatriId(prefix = "DU") {
  const n = crypto.randomInt(0, 1000000); // 0..999999
  return `${prefix}${String(n).padStart(6, "0")}`;
}

/** Backfill matri_id for an existing profile if it's NULL/empty. Retries on 23505 collisions. */
async function ensureMatriId(profileId) {
  // If already has a value, return it
  const cur = await query(`SELECT matri_id FROM matrimony_profiles WHERE id = $1`, [profileId]);
  const current = cur.rows[0]?.matri_id;
  if (current && String(current).trim() !== "") return current;

  // Try a few candidates until update succeeds
  for (let i = 0; i < 8; i++) {
    const candidate = genMatriId("DU");
    try {
      const up = await query(
        `UPDATE matrimony_profiles
           SET matri_id = $1
         WHERE id = $2 AND (matri_id IS NULL OR matri_id = '')
         RETURNING matri_id`,
        [candidate, profileId]
      );
      if (up.rows.length) return up.rows[0].matri_id; // success
    } catch (e) {
      // 23505 = unique violation on matri_id; try another candidate
      if (e?.code === "23505") continue;
      throw e;
    }
  }
  // Final read (in case another request set it)
  const fin = await query(`SELECT matri_id FROM matrimony_profiles WHERE id = $1`, [profileId]);
  return fin.rows[0]?.matri_id || null;
}

/** Create a profile (with gender + unique matri_id), safe against races */
async function createProfileIfMissing(userId) {
  // Try read gender from users; default 'U'
  let gender = "U";
  try {
    const gr = await query(
      `SELECT COALESCE(gender, 'U') AS gender FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (gr.rows[0]?.gender) gender = String(gr.rows[0].gender);
  } catch (e) {
    if (e?.code !== "42703") throw e; // ignore "column does not exist"
  }

  const newProfileId = uuidv4();

  while (true) {
    const newMatriId = genMatriId("DU");
    try {
      await query(
        `INSERT INTO matrimony_profiles (id, user_id, first_name, matri_id, gender)
         VALUES ($1, $2, $3, $4, $5)`,
        [newProfileId, userId, "", newMatriId, gender]
      );
      return { id: newProfileId, matri_id: newMatriId };
    } catch (e) {
      // matri_id collision -> try again
      if (e?.code === "23505" && String(e.detail || "").includes("(matri_id)")) continue;

      // profile for this user created by another request -> fetch it
      if (e?.code === "23505" && String(e.detail || "").includes("(user_id)")) {
        const r = await query(
          `SELECT id, matri_id FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        return r.rows[0];
      }
      throw e;
    }
  }
}

export async function GET() {
  try {
    // --- Auth ---
    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value || cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = process.env.JWT_SECRET;
    if (!secret) return NextResponse.json({ error: "Server misconfig" }, { status: 500 });

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = payload.uid || payload.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // --- Load or create profile ---
    // 1. Light check
    let checkRes = await query(
      `SELECT id FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    let profileId = checkRes.rows[0]?.id;
    if (!profileId) {
      const created = await createProfileIfMissing(userId);
      profileId = created.id;
    }

    // 2. Full Fetch with Details
    const profRes = await query(
      `SELECT 
         mp.id, mp.user_id, COALESCE(mp.first_name,'') AS first_name, mp.matri_id, mp.gender,
         mp.dob, mp.height_cm, mp.about_me, mp.annual_income_inr,
         l.name AS tongue,
         r.name AS religion,
         c.name AS caste,
         ci.name AS city,
         st.name AS state,
         co.name AS country,
         edu.name AS education,
         prof.name AS job
      FROM matrimony_profiles mp
      LEFT JOIN languages l ON l.id = mp.mother_tongue_id
      LEFT JOIN religions r ON r.id = mp.religion_id
      LEFT JOIN castes c ON c.id = mp.caste_id
      LEFT JOIN cities ci ON ci.id = mp.city_id
      LEFT JOIN states st ON st.id = mp.state_id
      LEFT JOIN countries co ON co.id = mp.country_id
      LEFT JOIN educations edu ON edu.id = mp.education_id
      LEFT JOIN professions prof ON prof.id = mp.profession_id
      WHERE mp.id = $1
      LIMIT 1`,
      [profileId]
    );

    const profile = profRes.rows[0];

    // --- Ensure matri_id exists even on old rows (backfill) ---
    const ensuredMatriId = await ensureMatriId(profile.id);

    // --- User basics ---
    const userRes = await query(
      `SELECT COALESCE(first_name,'') AS u_first_name, email
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [userId]
    );
    const u = userRes.rows[0] || { u_first_name: "", email: "" };
    const firstName = profile.first_name || u.u_first_name;

    // --- Photo: primary first, then latest ---
    const photoRes = await query(
      `SELECT path
         FROM photos
        WHERE profile_id = $1
        ORDER BY (CASE WHEN is_primary THEN 1 ELSE 0 END) DESC,
                 created_at DESC, id DESC
        LIMIT 1`,
      [profile.id]
    );
    const photoPath = photoRes.rows[0]?.path || "/uploads/default.jpg";

    // --- Response ---
    return NextResponse.json(
      {
        profile: {
          user_id: profile.user_id,
          profile_id: profile.id,
          first_name: firstName,
          email: u.email,
          matri_id: ensuredMatriId,
          photo: photoPath,
          gender: profile.gender,
          aboutMyself: profile.about_me,
          basic: {
            dob: profile.dob,
            height: profile.height_cm,
            tongue: profile.tongue
          },
          religionInfo: {
            religion: profile.religion,
            caste: profile.caste
          },
          location: {
            city: profile.city,
            state: profile.state,
            country: profile.country
          },
          professional: {
            education: profile.education,
            job: profile.job,
            income: profile.annual_income_inr
          }
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("my-home error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
