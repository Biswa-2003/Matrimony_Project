import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

/** Extra admin dashboard data: 14-day sign-up trend, activity, and the "needs attention" queue counts. */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
  try {
    await ensureSchema().catch(() => {});
    const safe = (sql) => query(sql).catch((e) => { console.error("[admin/overview]", e.message); return { rows: [] }; });
    const [trend, activity, attention] = await Promise.all([
      safe(`SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COUNT(u.id)::int AS count
              FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
              LEFT JOIN users u ON u.created_at::date = d.day::date
             GROUP BY d.day ORDER BY d.day`),
      safe(`SELECT
              (SELECT COUNT(*)::int FROM users WHERE last_login_at::date = CURRENT_DATE) AS active_today,
              (SELECT COUNT(*)::int FROM users WHERE last_login_at > NOW() - INTERVAL '7 days') AS active_week,
              (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - INTERVAL '7 days') AS new_week,
              (SELECT COUNT(*)::int FROM interests WHERE created_at > NOW() - INTERVAL '7 days') AS interests_week,
              (SELECT COUNT(*)::int FROM interests WHERE status = 'accepted') AS connections_total`),
      safe(`SELECT
              (SELECT COUNT(*)::int FROM matrimony_profiles WHERE COALESCE(is_verified, FALSE) = FALSE) AS pending_verifications,
              (SELECT COUNT(*)::int FROM reports WHERE status = 'open') AS open_reports,
              (SELECT COUNT(*)::int FROM contact_messages WHERE status = 'new') AS new_messages,
              (SELECT COUNT(*)::int FROM success_stories WHERE COALESCE(is_approved, FALSE) = FALSE) AS pending_stories,
              ((SELECT COUNT(*)::int FROM messages WHERE flagged AND reviewed_at IS NULL AND deleted_at IS NULL)
               + (SELECT COUNT(*)::int FROM content_flags WHERE status = 'open')) AS flagged_items,
              (SELECT COUNT(*)::int FROM otp_verification o
                WHERE o.otp_expiry > NOW() AND COALESCE(o.delivery, '') NOT IN ('sent', 'admin')
                  AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = o.email)) AS otp_help`),
    ]);
    return NextResponse.json({
      ok: true,
      signups14d: trend.rows,
      activity: activity.rows[0] || {},
      attention: attention.rows[0] || {},
    });
  } catch (e) {
    console.error("[admin/overview]", e);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
