// app/api/daily-recommendations/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// same helper style as your other APIs
async function getUserId() {
  const c = await cookies();
  const token =
    c.get("token")?.value ||
    c.get("auth_token")?.value ||
    c.get("auth")?.value;

  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    return d?.id ?? d?.userId ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const meId = await getUserId();
  if (!meId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1) Get current user's gender
    const meRes = await query(
      `SELECT gender FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`,
      [meId]
    );

    let targetGender = null;
    if (meRes.rows.length) {
      const myGender = String(meRes.rows[0].gender || "").toUpperCase();
      if (myGender.startsWith("M")) targetGender = "F";
      else if (myGender.startsWith("F")) targetGender = "M";
    }

    // 2) Build WHERE + params using only matrimony_profiles
    const where = [
      `p.user_id <> $1`      // not me
      // 🚫 removed is_active here to avoid missing-column errors
    ];
    const params = [meId];

    if (targetGender) {
      // assumes values like 'Male', 'M', 'Female', 'F'
      where.push(`UPPER(p.gender) LIKE $${params.length + 1}`);
      params.push(targetGender + "%");
    }

    const sql = `
      SELECT
        p.user_id                 AS id,
        COALESCE(p.first_name,'') AS name,
        p.matri_id,
        ph.path                   AS photo_url,
        p.gender,
        p.updated_at
      FROM matrimony_profiles p
      LEFT JOIN LATERAL (
        SELECT path FROM photos ph 
        WHERE ph.profile_id = p.id 
        ORDER BY ph.is_primary DESC, ph.created_at DESC 
        LIMIT 1
      ) ph ON TRUE
      WHERE ${where.join(" AND ")}
      ORDER BY p.updated_at DESC
      LIMIT 10
    `;

    const { rows } = await query(sql, params);

    // photosCount: 0 for now (no extra photos table)
    const users = rows.map((r) => ({
      id: r.id,
      name: r.name || r.matri_id,
      matri_id: r.matri_id,
      photo_url: r.photo_url || "/uploads/default.jpg",
      photosCount: 0,
    }));

    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error("daily-recommendations error:", err);
    return NextResponse.json(
      { error: "Failed to load recommendations" },
      { status: 500 }
    );
  }
}
