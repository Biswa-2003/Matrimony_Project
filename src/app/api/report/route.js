import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, profileIdOf } from "@/lib/schema";
import { findMemberByMatriId } from "@/lib/members";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const REPORT_REASONS = [
  "Fake profile / impersonation",
  "Inappropriate photos or content",
  "Harassment or abusive messages",
  "Asking for money / scam",
  "Already married / misleading details",
  "Other",
];

/** POST { matri_id, reason, details?, block? } → file a report for admin review (optionally also block). */
export async function POST(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ ok: false, error: "Please log in." }, { status: 401 });
  if (!rateLimit(`report:${me}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many reports. Please try again later." }, { status: 429 });
  }
  try {
    await ensureSchema();
    const { matri_id, reason, details, block } = await req.json().catch(() => ({}));
    const t = await findMemberByMatriId(matri_id);
    if (!t) return NextResponse.json({ ok: false, error: "Profile not found." }, { status: 404 });
    if (String(t.userId) === String(me)) return NextResponse.json({ ok: false, error: "You cannot report yourself." }, { status: 400 });
    if (!REPORT_REASONS.includes(reason)) return NextResponse.json({ ok: false, error: "Please choose a reason." }, { status: 400 });

    const myProfileId = await profileIdOf(me);
    if (!myProfileId) return NextResponse.json({ ok: false, error: "Please complete your profile first." }, { status: 400 });
    await query(
      `INSERT INTO reports (id, reporter_id, reported_id, reason, details, status, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'open', NOW())`,
      [myProfileId, t.profileId, reason, String(details || "").slice(0, 2000) || null]
    );
    if (block) {
      await query(`INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`, [myProfileId, t.profileId]);
    }
    return NextResponse.json({ ok: true, message: "Thank you. Our safety team will review this profile within 24 hours." });
  } catch (e) {
    console.error("[report] POST failed:", e);
    return NextResponse.json({ ok: false, error: "Could not submit the report." }, { status: 500 });
  }
}
