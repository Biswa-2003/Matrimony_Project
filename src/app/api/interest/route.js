// app/api/interest/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { ensureSchema, notBlockedSql, isBlockedBetween } from "@/lib/schema";

import { clientIp, limitOr429 } from "@/lib/rate-limit";
import { photoUrl } from "@/lib/members";
import { emailInterestReceived, emailInterestAccepted } from "@/lib/emails";
import { verifyLogin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getUserId() {
  const c = await cookies();
  const token =
    c.get("token")?.value || c.get("auth_token")?.value || c.get("auth")?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const d = await verifyLogin(token);
    return d?.id ?? d?.userId ?? null;
  } catch {
    return null;
  }
}

/* ---------------- POST: send interest ---------------- */
export async function POST(req) {
  { const limited = limitOr429(`interest-send:${clientIp(req)}`, 100, 60 * 60 * 1000, "You have sent a lot of interests in a short time. Please try again later."); if (limited) return limited; }
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
  if (String(toId) === String(meId)) {
    return NextResponse.json(
      { error: "Cannot send to yourself" },
      { status: 400 }
    );
  }

  // Blocked in either direction -> not allowed
  try {
    if (await isBlockedBetween(meId, toId)) {
      return NextResponse.json({ error: "You can't send an interest to this member." }, { status: 403 });
    }
  } catch { /* blocks table unavailable */ }

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
    if (existing.status === "cancelled" && String(existing.from_profile) === String(meId)) {
      // re-sending after withdrawing earlier
      await query(`UPDATE interests SET status = 'sent', updated_at = NOW() WHERE id = $1`, [existing.id]);
      emailInterestReceived(meId, toId);
      return NextResponse.json({ ok: true, resent: true, id: existing.id });
    }
    if (existing.status === "declined" && String(existing.from_profile) === String(meId)) {
      return NextResponse.json({ error: "This member has declined your earlier interest." }, { status: 400 });
    }
    if (String(existing.from_profile) === String(meId)) {
      return NextResponse.json({ error: "You have already sent an interest to this member." }, { status: 400 });
    } else {
      return NextResponse.json({ error: "This member has already sent you an interest. Check your Received Interests." }, { status: 400 });
    }
  }

  const ins = await query(
    `INSERT INTO interests (from_profile,to_profile,status,created_at,updated_at)
     VALUES ($1,$2,'sent',NOW(),NOW()) RETURNING id`,
    [meId, toId]
  );
  emailInterestReceived(meId, toId);

  return NextResponse.json({ ok: true, id: ins.rows[0]?.id });
}

/* ---------------- PATCH: accept / decline / withdraw ---------------- */
export async function PATCH(req) {
  { const limited = limitOr429(`interest-reply:${clientIp(req)}`, 100, 10 * 60 * 1000); if (limited) return limited; }
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
    emailInterestAccepted(meId, rows[0].from_profile);
    return NextResponse.json({ ok: true, interest: rows[0] });
  }

  if (action === "decline") {
    // only the receiver can decline a pending interest
    const { rows } = await query(
      `UPDATE interests SET status = 'declined', updated_at = NOW()
        WHERE id = $1 AND to_profile = $2 AND status = 'sent' RETURNING *`,
      [id, meId]
    );
    if (!rows.length) return NextResponse.json({ error: "Interest not found or already answered" }, { status: 404 });
    return NextResponse.json({ ok: true, interest: rows[0] });
  }

  if (action === "withdraw") {
    // only the sender can withdraw an interest that hasn't been answered yet
    const { rows } = await query(
      `UPDATE interests SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND from_profile = $2 AND status = 'sent' RETURNING id`,
      [id, meId]
    );
    if (!rows.length) return NextResponse.json({ error: "Interest not found or already answered" }, { status: 404 });
    return NextResponse.json({ ok: true, withdrawn: true });
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
        COUNT(*) FILTER (WHERE from_profile = $1 AND status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE to_profile = $1 AND status = 'declined') AS declined,
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
      sent: Number(row.sent || 0),
      declined: Number(row.declined || 0),
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

  // never show members blocked in either direction
  try {
    await ensureSchema();
    where.push(notBlockedSql(`$${params.indexOf(meId) + 1}`, partnerJoinCol));
  } catch { /* blocks table unavailable */ }

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
    results: rows.map((r) => ({ ...r, photo_url: photoUrl(r.photo_url) })),
    page,
    limit,
    total,
  });
}
