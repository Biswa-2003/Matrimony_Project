import { NextResponse } from "next/server";
import { logAdmin } from "@/lib/admin-audit";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

const denied = () => NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });

/**
 * GET ?type=reports|messages&status=open|resolved|dismissed|new|handled|all
 */
export async function GET(req) {
  if (!(await isAdmin())) return denied();
  try {
    await ensureSchema();
    const sp = new URL(req.url).searchParams;
    const type = sp.get("type") === "messages" ? "messages" : "reports";
    const status = (sp.get("status") || (type === "reports" ? "open" : "new")).toLowerCase();

    if (type === "messages") {
      const { rows } = await query(
        `SELECT id, name, email, mobile, subject, message, status, created_at
           FROM contact_messages
          WHERE ($1 = 'all' OR status = $1)
          ORDER BY created_at DESC LIMIT 200`,
        [status]
      );
      const counts = (await query(`SELECT status, COUNT(*)::int n FROM contact_messages GROUP BY status`)).rows;
      return NextResponse.json({ ok: true, type, results: rows, counts });
    }

    const { rows } = await query(
      `SELECT r.id, r.reason, r.details, r.status, r.created_at, r.resolved_at, r.admin_note,
              rp.matri_id AS reported_matri_id,
              TRIM(CONCAT_WS(' ', rp.first_name, rp.last_name)) AS reported_name,
              COALESCE(rp.is_active, TRUE) AS reported_active,
              rr.matri_id AS reporter_matri_id,
              TRIM(CONCAT_WS(' ', rr.first_name, rr.last_name)) AS reporter_name,
              (SELECT COUNT(*)::int FROM reports r2 WHERE r2.reported_id = r.reported_id) AS total_reports_against
         FROM reports r
         LEFT JOIN matrimony_profiles rp ON rp.id = r.reported_id
         LEFT JOIN matrimony_profiles rr ON rr.id = r.reporter_id
        WHERE ($1 = 'all' OR r.status = $1)
        ORDER BY r.created_at DESC LIMIT 200`,
      [status]
    );
    const counts = (await query(`SELECT status, COUNT(*)::int n FROM reports GROUP BY status`)).rows;
    return NextResponse.json({ ok: true, type, results: rows, counts });
  } catch (e) {
    console.error("[admin/reports] GET failed:", e);
    return NextResponse.json({ error: "Failed to load moderation queue" }, { status: 500 });
  }
}

/**
 * PATCH { type:'reports', id, status:'resolved'|'dismissed'|'open', deactivate?:boolean, note? }
 * PATCH { type:'messages', id, status:'handled'|'new' }
 */
export async function PATCH(req) {
  if (!(await isAdmin())) return denied();
  try {
    await ensureSchema();
    const { type, id, status, deactivate, note } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    if (type === "messages") {
      if (!["handled", "new"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      await query(`UPDATE contact_messages SET status = $2 WHERE id = $1`, [id, status]);
      return NextResponse.json({ ok: true });
    }

    if (!["resolved", "dismissed", "open"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const { rows } = await query(
      `UPDATE reports
          SET status = $2,
              admin_note = COALESCE($3, admin_note),
              resolved_at = CASE WHEN $2 = 'open' THEN NULL ELSE NOW() END
        WHERE id = $1
      RETURNING reported_id`,
      [id, status, note ? String(note).slice(0, 1000) : null]
    );
    if (!rows.length) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    if (deactivate) {
      await query(`UPDATE matrimony_profiles SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [rows[0].reported_id]);
    }
    const target = await query(`SELECT user_id FROM matrimony_profiles WHERE id = $1`, [rows[0].reported_id]).catch(() => ({ rows: [] }));
    await logAdmin("report.update", target.rows[0]?.user_id || null, { status, deactivate: Boolean(deactivate), reason: note || null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/reports] PATCH failed:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
