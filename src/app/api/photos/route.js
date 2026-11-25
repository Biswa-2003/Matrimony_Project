// src/app/api/photos/route.js — manage MY photos
//   GET                              → { photos[], max, locked, requests: { pending, recent[] } }
//   PATCH { id, action: "primary" }  → make a photo the main one
//   PATCH { locked: boolean }        → photo privacy
//   DELETE ?id=                      → remove a photo
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { limitOr429 } from "@/lib/rate-limit";
import { photoUrl } from "@/lib/members";
import { MAX_PHOTOS, profileOfUser } from "@/lib/photos";
import { deleteMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET() {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const prof = await profileOfUser(me);
  if (!prof) return NextResponse.json({ photos: [], max: MAX_PHOTOS, locked: false, requests: { pending: 0, recent: [] } });

  const { rows } = await query(
    `SELECT id, path, is_primary, created_at FROM photos WHERE profile_id = $1 ORDER BY is_primary DESC, created_at DESC`,
    [prof.id]
  );
  const reqs = await query(
    `SELECT mp.matri_id, COALESCE(NULLIF(TRIM(mp.first_name), ''), mp.matri_id) AS name, mp.gender, r.created_at
       FROM photo_requests r JOIN matrimony_profiles mp ON mp.user_id = r.requester_id
      WHERE r.owner_id = $1 AND r.status = 'pending'
      ORDER BY r.created_at DESC LIMIT 10`,
    [me]
  );
  return NextResponse.json({
    photos: rows.map((r) => ({ id: r.id, url: photoUrl(r.path), is_primary: r.is_primary, created_at: r.created_at })),
    max: MAX_PHOTOS,
    locked: prof.photo_locked,
    requests: { pending: reqs.rows.length, recent: reqs.rows },
  });
}

export async function PATCH(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = limitOr429(`photos-edit:${me}`, 40, 10 * 60 * 1000);
  if (limited) return limited;
  await ensureSchema();
  const prof = await profileOfUser(me);
  if (!prof) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  if (typeof body.locked === "boolean") {
    await query(`UPDATE matrimony_profiles SET photo_locked = $1, updated_at = NOW() WHERE id = $2`, [body.locked, prof.id]);
    return NextResponse.json({ ok: true, locked: body.locked });
  }

  if (body.action === "primary" && UUID.test(String(body.id || ""))) {
    const own = await query(`SELECT 1 FROM photos WHERE id = $1 AND profile_id = $2`, [body.id, prof.id]);
    if (!own.rows.length) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    await query(`UPDATE photos SET is_primary = (id = $1) WHERE profile_id = $2`, [body.id, prof.id]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = limitOr429(`photos-edit:${me}`, 40, 10 * 60 * 1000);
  if (limited) return limited;
  await ensureSchema();
  const id = new URL(req.url).searchParams.get("id");
  if (!UUID.test(String(id || ""))) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const prof = await profileOfUser(me);
  if (!prof) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const { rows } = await query(
    `DELETE FROM photos WHERE id = $1 AND profile_id = $2 RETURNING media_id, is_primary`,
    [id, prof.id]
  );
  if (!rows.length) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  await deleteMedia(rows[0].media_id);
  if (rows[0].is_primary) {
    // promote the newest remaining photo
    await query(
      `UPDATE photos SET is_primary = true WHERE id = (SELECT id FROM photos WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1)`,
      [prof.id]
    );
  }
  return NextResponse.json({ ok: true });
}
