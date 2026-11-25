// src/app/api/photo-request/route.js
//   POST { matri_id } → ask a member to add (or share) their photo
//   GET  ?matri_id=   → { requested: boolean }
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, isBlockedBetween } from "@/lib/schema";
import { findMemberByMatriId } from "@/lib/members";
import { limitOr429 } from "@/lib/rate-limit";
import { emailPhotoRequest } from "@/lib/emails";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ requested: false });
  await ensureSchema();
  const t = await findMemberByMatriId(new URL(req.url).searchParams.get("matri_id"));
  if (!t) return NextResponse.json({ requested: false });
  const { rows } = await query(
    `SELECT status FROM photo_requests WHERE requester_id = $1 AND owner_id = $2`,
    [me, t.userId]
  );
  return NextResponse.json({ requested: rows[0]?.status === "pending" });
}

export async function POST(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const limited = limitOr429(`photo-req:${me}`, 30, 24 * 60 * 60 * 1000, "You've sent many photo requests today. Please try again tomorrow.");
  if (limited) return limited;
  await ensureSchema();

  const { matri_id } = await req.json().catch(() => ({}));
  const t = await findMemberByMatriId(matri_id);
  if (!t) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (String(t.userId) === String(me)) return NextResponse.json({ error: "That's your own profile." }, { status: 400 });
  if (await isBlockedBetween(me, t.userId)) return NextResponse.json({ error: "You can't contact this member." }, { status: 403 });

  const { rows } = await query(
    `INSERT INTO photo_requests (requester_id, owner_id) VALUES ($1, $2)
     ON CONFLICT (requester_id, owner_id) DO UPDATE
       SET status = 'pending', created_at = CASE WHEN photo_requests.status = 'pending' THEN photo_requests.created_at ELSE NOW() END
     RETURNING (xmax = 0) AS inserted`,
    [me, t.userId]
  );
  if (rows[0]?.inserted) emailPhotoRequest(me, t.userId); // only email the first time
  return NextResponse.json({ ok: true, requested: true, message: "Request sent. We'll let them know you'd like to see their photo." });
}
