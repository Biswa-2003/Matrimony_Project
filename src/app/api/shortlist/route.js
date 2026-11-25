import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, notBlockedSql } from "@/lib/schema";
import { findMemberByMatriId, photoUrl, MEMBER_CARD_SQL, MEMBER_CARD_JOINS } from "@/lib/members";

import { clientIp, limitOr429 } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ ok: false, error: "Please log in." }, { status: 401 });

/**
 * GET  /api/shortlist                  → my shortlisted profiles
 * GET  /api/shortlist?matri_id=DU123   → { shortlisted: boolean }
 */
export async function GET(req) {
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const sp = new URL(req.url).searchParams;
    const check = sp.get("matri_id");
    if (check) {
      const target = await findMemberByMatriId(check);
      if (!target) return NextResponse.json({ ok: true, shortlisted: false });
      const { rows } = await query(`SELECT 1 FROM shortlists WHERE user_id = $1 AND target_user_id = $2`, [me, target.userId]);
      return NextResponse.json({ ok: true, shortlisted: rows.length > 0 });
    }

    const { rows } = await query(
      `SELECT ${MEMBER_CARD_SQL}, s.created_at AS shortlisted_at
         FROM shortlists s
         JOIN matrimony_profiles mp ON mp.user_id = s.target_user_id
         ${MEMBER_CARD_JOINS}
        WHERE s.user_id = $1 AND ${notBlockedSql("$1", "mp.user_id")}
        ORDER BY s.created_at DESC
        LIMIT 200`,
      [me]
    );
    const results = rows.map((r) => ({ ...r, photo: photoUrl(r.photo) }));
    return NextResponse.json({ ok: true, total: results.length, results });
  } catch (e) {
    console.error("[shortlist] GET failed:", e);
    return NextResponse.json({ ok: false, error: "Could not load your shortlist." }, { status: 500 });
  }
}

/** POST { matri_id } → add to shortlist (idempotent) */
export async function POST(req) {
  { const limited = limitOr429(`shortlist:${clientIp(req)}`, 120, 10 * 60 * 1000); if (limited) return limited; }
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const { matri_id } = await req.json().catch(() => ({}));
    const target = await findMemberByMatriId(matri_id);
    if (!target) return NextResponse.json({ ok: false, error: "Profile not found." }, { status: 404 });
    if (String(target.userId) === String(me)) {
      return NextResponse.json({ ok: false, error: "You cannot shortlist your own profile." }, { status: 400 });
    }
    await query(
      `INSERT INTO shortlists (user_id, target_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [me, target.userId]
    );
    return NextResponse.json({ ok: true, shortlisted: true });
  } catch (e) {
    console.error("[shortlist] POST failed:", e);
    return NextResponse.json({ ok: false, error: "Could not update your shortlist." }, { status: 500 });
  }
}

/** DELETE ?matri_id=DU123 → remove from shortlist */
export async function DELETE(req) {
  { const limited = limitOr429(`shortlist:${clientIp(req)}`, 120, 10 * 60 * 1000); if (limited) return limited; }
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const target = await findMemberByMatriId(new URL(req.url).searchParams.get("matri_id"));
    if (target) await query(`DELETE FROM shortlists WHERE user_id = $1 AND target_user_id = $2`, [me, target.userId]);
    return NextResponse.json({ ok: true, shortlisted: false });
  } catch (e) {
    console.error("[shortlist] DELETE failed:", e);
    return NextResponse.json({ ok: false, error: "Could not update your shortlist." }, { status: 500 });
  }
}
