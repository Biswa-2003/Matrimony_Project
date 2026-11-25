import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { storeImage } from "@/lib/media";

export const dynamic = "force-dynamic";
const denied = () => NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });

const fieldsFrom = (form) => ({
  couple_name: String(form.get("couple_name") || "").trim().slice(0, 120),
  story: String(form.get("story") || "").trim().slice(0, 2000),
  marriage_date: String(form.get("marriage_date") || "").trim() || null,
  rating: Math.min(5, Math.max(1, Number(form.get("rating")) || 5)),
  is_approved: String(form.get("is_approved") || "true") === "true",
});

/** GET ?status=all|approved|pending */
export async function GET(req) {
  if (!(await isAdmin())) return denied();
  try {
    const status = new URL(req.url).searchParams.get("status") || "all";
    const where = status === "approved" ? "WHERE is_approved = TRUE" : status === "pending" ? "WHERE COALESCE(is_approved, FALSE) = FALSE" : "";
    const { rows } = await query(
      `SELECT id, couple_name, story, marriage_date, image_url, rating, COALESCE(is_approved, FALSE) AS is_approved, created_at
         FROM success_stories ${where} ORDER BY created_at DESC LIMIT 200`
    );
    const counts = (await query(`SELECT COALESCE(is_approved, FALSE) AS approved, COUNT(*)::int n FROM success_stories GROUP BY 1`)).rows;
    return NextResponse.json({
      ok: true,
      results: rows,
      counts: { approved: counts.find((c) => c.approved)?.n || 0, pending: counts.find((c) => !c.approved)?.n || 0 },
    });
  } catch (e) {
    console.error("[admin/stories] GET", e);
    return NextResponse.json({ error: "Failed to load stories" }, { status: 500 });
  }
}

/** POST multipart → create a story (admin-added stories are approved by default) */
export async function POST(req) {
  if (!(await isAdmin())) return denied();
  try {
    const form = await req.formData();
    const f = fieldsFrom(form);
    if (!f.couple_name || !f.story) return NextResponse.json({ error: "Couple name and story are required." }, { status: 400 });
    const file = form.get("image");
    const image_url = file && file.size ? (await storeImage(file)).url : null;
    const { rows } = await query(
      `INSERT INTO success_stories (couple_name, story, marriage_date, image_url, rating, is_approved, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
      [f.couple_name, f.story, f.marriage_date, image_url, f.rating, f.is_approved]
    );
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (e) {
    const userError = /image|choose|large|allowed/i.test(e.message);
    if (!userError) console.error("[admin/stories] POST", e);
    return NextResponse.json({ error: userError ? e.message : "Failed to save story" }, { status: userError ? 400 : 500 });
  }
}

/** PATCH multipart { id, ...fields, image? }  — or JSON { id, is_approved } for quick approve/hide */
export async function PATCH(req) {
  if (!(await isAdmin())) return denied();
  try {
    if ((req.headers.get("content-type") || "").includes("application/json")) {
      const { id, is_approved } = await req.json();
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      await query(`UPDATE success_stories SET is_approved = $2 WHERE id = $1`, [id, Boolean(is_approved)]);
      return NextResponse.json({ ok: true });
    }
    const form = await req.formData();
    const id = form.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const f = fieldsFrom(form);
    if (!f.couple_name || !f.story) return NextResponse.json({ error: "Couple name and story are required." }, { status: 400 });
    const file = form.get("image");
    const newImage = file && file.size ? (await storeImage(file)).url : null;
    await query(
      `UPDATE success_stories
          SET couple_name = $2, story = $3, marriage_date = $4, rating = $5, is_approved = $6,
              image_url = COALESCE($7, image_url)
        WHERE id = $1`,
      [id, f.couple_name, f.story, f.marriage_date, f.rating, f.is_approved, newImage]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const userError = /image|choose|large|allowed/i.test(e.message);
    if (!userError) console.error("[admin/stories] PATCH", e);
    return NextResponse.json({ error: userError ? e.message : "Failed to update story" }, { status: userError ? 400 : 500 });
  }
}

/** DELETE ?id= */
export async function DELETE(req) {
  if (!(await isAdmin())) return denied();
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (id) {
      const { rows } = await query(`DELETE FROM success_stories WHERE id = $1 RETURNING image_url`, [id]);
      // remove the story photo too when it lives in our media store
      const m = String(rows[0]?.image_url || "").match(/^\/api\/media\/([0-9a-f-]{36})$/i);
      if (m) await query(`DELETE FROM media_files WHERE id = $1`, [m[1]]).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/stories] DELETE", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
