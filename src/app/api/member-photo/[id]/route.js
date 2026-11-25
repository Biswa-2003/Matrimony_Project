// src/app/api/member-photo/[id]/route.js
// Serves a member photo, enforcing the owner's photo lock:
// locked photos are only sent to the owner, their accepted connections and admins.
// Everyone else gets a "locked" placeholder — the real image never leaves the server.
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { canSeePhotos } from "@/lib/photos";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOCKED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 375"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6ead0"/><stop offset="1" stop-color="#ead7ae"/></linearGradient></defs><rect width="300" height="375" fill="url(#g)"/><circle cx="150" cy="150" r="58" fill="#5a0f22"/><rect x="128" y="146" width="44" height="34" rx="6" fill="#e8cf8e"/><path d="M136 146v-12a14 14 0 0 1 28 0v12" stroke="#e8cf8e" stroke-width="7" fill="none"/><text x="150" y="250" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#5a0f22">Photo protected</text><text x="150" y="278" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#7a6a6e">Visible once you connect</text></svg>`;

const lockedResponse = () =>
  new Response(LOCKED_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });

export async function GET(_req, { params }) {
  const { id } = await params;
  if (!UUID.test(String(id))) return new Response("Not found", { status: 404 });
  try {
    const { rows } = await query(
      `SELECT ph.media_id, mp.user_id AS owner, COALESCE(mp.photo_locked, false) AS locked
         FROM photos ph JOIN matrimony_profiles mp ON mp.id = ph.profile_id
        WHERE ph.id = $1`,
      [id]
    );
    const p = rows[0];
    if (!p?.media_id) return new Response("Not found", { status: 404 });

    if (p.locked) {
      const viewer = await getUserIdFromCookie();
      if (!(await canSeePhotos(viewer, p.owner, true))) return lockedResponse();
    }

    const m = await query(`SELECT content_type, data FROM media_files WHERE id = $1`, [p.media_id]);
    if (!m.rows[0]) return new Response("Not found", { status: 404 });
    return new Response(m.rows[0].data, {
      headers: {
        "Content-Type": m.rows[0].content_type,
        // private + short: a member can lock photos (or block someone) at any time
        "Cache-Control": p.locked ? "private, no-store" : "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (e) {
    console.error("[member-photo]", e.message);
    return new Response("Error", { status: 500 });
  }
}
