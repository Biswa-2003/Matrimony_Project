import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, profileIdOf } from "@/lib/schema";
import { findMemberByMatriId, photoUrl, MEMBER_CARD_SQL, MEMBER_CARD_JOINS } from "@/lib/members";

import { clientIp, limitOr429 } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ ok: false, error: "Please log in." }, { status: 401 });

/** GET → my blocked members;  GET ?matri_id= → { blocked } */
export async function GET(req) {
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const check = new URL(req.url).searchParams.get("matri_id");
    if (check) {
      const t = await findMemberByMatriId(check);
      if (!t) return NextResponse.json({ ok: true, blocked: false });
      const { rows } = await query(`SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`, [await profileIdOf(me), t.profileId]);
      return NextResponse.json({ ok: true, blocked: rows.length > 0 });
    }
    const { rows } = await query(
      `SELECT ${MEMBER_CARD_SQL}, b.created_at AS blocked_at
         FROM blocks b JOIN matrimony_profiles mp ON mp.id = b.blocked_id
         ${MEMBER_CARD_JOINS}
        WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      [await profileIdOf(me)]
    );
    return NextResponse.json({ ok: true, results: rows.map((r) => ({ ...r, photo: photoUrl(r.photo) })) });
  } catch (e) {
    console.error("[block] GET failed:", e);
    return NextResponse.json({ ok: false, error: "Could not load blocked members." }, { status: 500 });
  }
}

/** POST { matri_id } → block. Also removes them from my shortlist and withdraws pending interests. */
export async function POST(req) {
  { const limited = limitOr429(`block:${clientIp(req)}`, 30, 10 * 60 * 1000); if (limited) return limited; }
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const { matri_id } = await req.json().catch(() => ({}));
    const t = await findMemberByMatriId(matri_id);
    if (!t) return NextResponse.json({ ok: false, error: "Profile not found." }, { status: 404 });
    if (String(t.userId) === String(me)) return NextResponse.json({ ok: false, error: "You cannot block yourself." }, { status: 400 });

    const myProfileId = await profileIdOf(me);
    if (!myProfileId) return NextResponse.json({ ok: false, error: "Please complete your profile first." }, { status: 400 });
    await query(`INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`, [myProfileId, t.profileId]);
    await query(`DELETE FROM shortlists WHERE (user_id = $1 AND target_user_id = $2) OR (user_id = $2 AND target_user_id = $1)`, [me, t.userId]);
    // interests.from_profile / to_profile hold USER ids
    await query(
      `UPDATE interests SET status = 'declined', updated_at = NOW()
        WHERE status = 'sent'
          AND ((from_profile = $1 AND to_profile = $2) OR (from_profile = $2 AND to_profile = $1))`,
      [me, t.userId]
    );
    return NextResponse.json({ ok: true, blocked: true });
  } catch (e) {
    console.error("[block] POST failed:", e);
    return NextResponse.json({ ok: false, error: "Could not block this member." }, { status: 500 });
  }
}

/** DELETE ?matri_id= → unblock */
export async function DELETE(req) {
  { const limited = limitOr429(`block:${clientIp(req)}`, 30, 10 * 60 * 1000); if (limited) return limited; }
  const me = await getUserIdFromCookie();
  if (!me) return unauthorized();
  try {
    await ensureSchema();
    const t = await findMemberByMatriId(new URL(req.url).searchParams.get("matri_id"));
    if (t) await query(`DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`, [await profileIdOf(me), t.profileId]);
    return NextResponse.json({ ok: true, blocked: false });
  } catch (e) {
    console.error("[block] DELETE failed:", e);
    return NextResponse.json({ ok: false, error: "Could not unblock this member." }, { status: 500 });
  }
}
