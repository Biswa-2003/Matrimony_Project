// app/api/interest/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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

/* ---------------- POST: send interest ---------------- */
export async function POST(req) {
  const meId = await getUserId();
  if (!meId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matri_id, receiver_id } = await req.json().catch(() => ({}));
  let toId = receiver_id;

  if (!toId && matri_id) {
    const r = await query(
      `SELECT user_id FROM matrimony_profiles WHERE LOWER(matri_id)=LOWER($1) LIMIT 1`,
      [String(matri_id)]
    );
    if (!r.rows.length) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    toId = r.rows[0].user_id;
  }

  if (!toId) {
    return NextResponse.json(
      { error: "receiver_id or matri_id required" },
      { status: 400 }
    );
  }
  if (+toId === +meId) {
    return NextResponse.json(
      { error: "Cannot send to yourself" },
      { status: 400 }
    );
  }

  // Check for ANY existing interaction in either direction
  const existingRes = await query(
    `SELECT * FROM interests 
     WHERE (from_profile = $1 AND to_profile = $2) 
        OR (from_profile = $2 AND to_profile = $1)
     LIMIT 1`,
    [meId, toId]
  );

  if (existingRes.rows.length > 0) {
    const existing = existingRes.rows[0];
    if (String(existing.from_profile) === String(meId)) {
      return NextResponse.json({ error: "You have already sent an interest to this member." }, { status: 400 });
    } else {
      return NextResponse.json({ error: "This member has already sent you an interest. Check your Received Interests." }, { status: 400 });
    }
  }

  await query(
    `INSERT INTO interests (from_profile,to_profile,status,created_at,updated_at)
     VALUES ($1,$2,'sent',NOW(),NOW())`,
    [meId, toId]
  );

  return NextResponse.json({ ok: true });
}

/* ---------------- PATCH: accept interest ---------------- */
export async function PATCH(req) {
  const meId = await getUserId();
  if (!meId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action } = await req.json().catch(() => ({}));

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (action === "accept") {
    // only the receiver can accept
    const sql = `
      UPDATE interests
      SET status = 'accepted',
          updated_at = NOW()
      WHERE id = $1
        AND to_profile = $2
      RETURNING *;
    `;
    const { rows } = await query(sql, [id, meId]);
    if (!rows.length) {
      return NextResponse.json(
        { error: "Interest not found or not yours" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, interest: rows[0] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/* ---------------- GET: list interests OR stats ---------------- */
export async function GET(req) {
  const meId = await getUserId();
  if (!meId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const mode = sp.get("mode") || "";   // "stats" | ""

  /* ---------- MODE: stats (used by dashboard) ---------- */
  if (mode.toLowerCase() === "stats") {
    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE to_profile = $1 AND status = 'sent') AS received,
        COUNT(*) FILTER (
          WHERE status = 'accepted' AND (to_profile = $1 OR from_profile = $1)
        ) AS accepted
      FROM interests
    `;
    const { rows } = await query(sql, [meId]);
    const row = rows[0] || {};
    // received = only pending requests
    const received = Number(row.received || 0);
    // accepted = total connections (bidirectional)
    const accepted = Number(row.accepted || 0);

    return NextResponse.json({
      ok: true,
      received,
      accepted,
    });
  }

  /* ---------- NORMAL MODE: list interests (shortlist, etc.) ---------- */
  const type = (sp.get("type") || "sent").toLowerCase();   // "sent" | "received"
  const status = (sp.get("status") || "all").toLowerCase(); // "all" | "sent" | "accepted" | ...
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(50, parseInt(sp.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  // Filter mainly by "Me"
  let partnerJoinCol;

  if (status === 'accepted') {
    // Show ALL accepted connections (regardless of who sent it)
    params.push(meId); // $1
    where.push(`(i.from_profile = $1 OR i.to_profile = $1)`);
    where.push(`i.status = 'accepted'`);
    partnerJoinCol = `CASE WHEN i.from_profile = $1 THEN i.to_profile ELSE i.from_profile END`;
  }
  else {
    // Normal sent/received fitering
    if (type === "sent") {
      // I am the sender
      where.push(`i.from_profile = $${params.push(meId)}`);
      partnerJoinCol = "i.to_profile";
    } else {
      // I am the receiver
      where.push(`i.to_profile = $${params.push(meId)}`);
      partnerJoinCol = "i.from_profile";
    }

    if (status !== "all") {
      where.push(`i.status = $${params.push(status)}`);
    }
  }

  const whereSql = where.length ? where.join(" AND ") : "TRUE";

  const sql = `
    SELECT 
      i.id,
      i.status,
      i.updated_at,
      i.created_at,
      
      -- Partner Profile Details
      p.matri_id,
      p.user_id,
      COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''), p.matri_id) AS full_name,
      p.gender,
      p.marital_status,
      p.height_cm,
      CAST(date_part('year', age(p.dob)) AS int) AS age_years,
      
      -- Joined Data
      ph.path AS photo_url,
      ci.name AS city_name,
      st.name AS state_name,
      co.name AS country_name,
      rel.name AS religion_name,
      cst.name AS caste_name,
      edu.name AS education_name,
      prof.name AS profession_name

    FROM interests i
    JOIN matrimony_profiles p ON p.user_id = ${partnerJoinCol}
    
    -- Photo
    LEFT JOIN LATERAL (
      SELECT path FROM photos ph 
      WHERE ph.profile_id = p.id 
      ORDER BY ph.is_primary DESC, ph.created_at DESC 
      LIMIT 1
    ) ph ON TRUE
    
    -- Lookups
    LEFT JOIN cities ci ON ci.id = p.city_id
    LEFT JOIN states st ON st.id = p.state_id
    LEFT JOIN countries co ON co.id = p.country_id
    LEFT JOIN religions rel ON rel.id = p.religion_id
    LEFT JOIN castes cst ON cst.id = p.caste_id
    LEFT JOIN educations edu ON edu.id = p.education_id
    LEFT JOIN professions prof ON prof.id = p.profession_id

    WHERE ${whereSql}
    ORDER BY i.updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const { rows } = await query(sql, params);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM interests i
    WHERE ${whereSql}
  `;
  const { rows: countRows } = await query(countSql, params);
  const total = Number(countRows?.[0]?.total || 0);

  return NextResponse.json({
    ok: true,
    results: rows,
    page,
    limit,
    total,
  });
}
