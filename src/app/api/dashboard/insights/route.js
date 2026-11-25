import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, notBlockedSql } from "@/lib/schema";

export const dynamic = "force-dynamic";

/**
 * Everything the member dashboard widgets need, in ONE request:
 *  - totals: profile visitors, pending interests, connections, sent-pending, who shortlisted me, my shortlist
 *  - views7d: profile views per day for the last 7 days
 *  - checklist: actionable profile-improvement tasks
 *  - plan: current membership, days left, contacts used
 */
export async function GET() {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureSchema().catch(() => {});
    const safe = (sql, params = [me]) =>
      query(sql, params).catch((e) => {
        console.error("[insights]", e.message);
        return { rows: [] };
      });

    const [totals, views, profile, plan, visitors] = await Promise.all([
      safe(
        `SELECT
           (SELECT COUNT(*)::int FROM profile_views v JOIN matrimony_profiles mp ON mp.user_id = v.viewer_id
              WHERE v.viewed_id = $1 AND ${notBlockedSql("$1", "v.viewer_id")}) AS visitors,
           (SELECT COUNT(*)::int FROM profile_views v WHERE v.viewed_id = $1 AND v.viewed_at > NOW() - INTERVAL '7 days') AS visitors_week,
           (SELECT COUNT(*)::int FROM interests WHERE to_profile = $1 AND status = 'sent') AS pending_received,
           (SELECT COUNT(*)::int FROM interests WHERE from_profile = $1 AND status = 'sent') AS pending_sent,
           (SELECT COUNT(*)::int FROM interests WHERE status = 'accepted' AND (from_profile = $1 OR to_profile = $1)) AS connections,
           (SELECT COUNT(*)::int FROM shortlists WHERE target_user_id = $1) AS shortlisted_me,
           (SELECT COUNT(*)::int FROM shortlists WHERE user_id = $1) AS my_shortlist`
      ),
      safe(
        `SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(COUNT(v.viewer_id), 0)::int AS count
           FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
           LEFT JOIN profile_views v ON v.viewed_id = $1 AND v.viewed_at::date = d.day::date
          GROUP BY d.day ORDER BY d.day`
      ),
      safe(
        `SELECT mp.id, mp.about_me, mp.about_family, mp.education_id, mp.education_detail, mp.profession_id, mp.job_role,
                mp.family_type, mp.father_occupation, mp.height_cm, mp.city_id, mp.created_at,
                COALESCE(mp.is_verified, FALSE) AS is_verified,
                EXISTS (SELECT 1 FROM photos ph WHERE ph.profile_id = mp.id) AS has_photo,
                EXISTS (SELECT 1 FROM partner_preferences pp WHERE pp.profile_id = mp.id
                        AND (pp.min_age IS NOT NULL OR pp.max_age IS NOT NULL OR pp.min_height_cm IS NOT NULL)) AS has_prefs
           FROM matrimony_profiles mp WHERE mp.user_id = $1 LIMIT 1`
      ),
      safe(
        `SELECT p.code, p.name, p.contact_limit, s.ends_at, s.remaining_contacts,
                GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.ends_at - NOW())) / 86400))::int AS days_left
           FROM subscriptions s JOIN plans p ON p.id = s.plan_id
          WHERE s.user_id = $1 AND s.ends_at >= NOW()
          ORDER BY s.ends_at DESC LIMIT 1`
      ),
      safe(
        `SELECT mp.matri_id, mp.first_name, mp.gender, v.viewed_at,
                (SELECT ph.path FROM photos ph WHERE ph.profile_id = mp.id ORDER BY ph.is_primary DESC, ph.created_at DESC LIMIT 1) AS photo
           FROM profile_views v JOIN matrimony_profiles mp ON mp.user_id = v.viewer_id
          WHERE v.viewed_id = $1 AND COALESCE(mp.is_active, TRUE) = TRUE AND ${notBlockedSql("$1", "v.viewer_id")}
          ORDER BY v.viewed_at DESC LIMIT 6`
      ),
    ]);

    const p = profile.rows[0] || {};
    const filled = (v) => v !== null && v !== undefined && String(v).trim() !== "";
    const checklist = [
      { key: "photo", label: "Add a profile photo", hint: "Members with a photo receive many more responses", done: Boolean(p.has_photo), href: "/dashboard/upload-photo", icon: "bi-camera" },
      { key: "about", label: "Write about yourself", hint: "A warm introduction of 2–3 lines", done: filled(p.about_me) && String(p.about_me).trim().length >= 30, href: "/dashboard/profile-edit#sec-aboutMyself", icon: "bi-chat-quote" },
      { key: "prefs", label: "Set partner preferences", hint: "Get better daily recommendations", done: Boolean(p.has_prefs), href: "/dashboard/profile-edit#sec-partnerPref", icon: "bi-hearts" },
      { key: "career", label: "Add education & career", hint: "Families look for this first", done: filled(p.education_id) || filled(p.education_detail) || filled(p.profession_id) || filled(p.job_role), href: "/dashboard/profile-edit#sec-professional", icon: "bi-mortarboard" },
      { key: "family", label: "Share family details", hint: "Family type, parents' occupation", done: filled(p.family_type) || filled(p.father_occupation) || filled(p.about_family), href: "/dashboard/profile-edit#sec-family", icon: "bi-house-heart" },
      { key: "verify", label: "Get your profile verified", hint: "Verified profiles earn more trust", done: Boolean(p.is_verified), href: "/matrimoney/contactus", icon: "bi-patch-check" },
    ];

    const pl = plan.rows[0] || null;
    return NextResponse.json({
      ok: true,
      totals: totals.rows[0] || {},
      views7d: views.rows,
      checklist,
      strength: Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100),
      memberSince: p.created_at || null,
      recentVisitors: visitors.rows.map((v) => ({
        ...v,
        photo: v.photo ? (/^(https?:|\/)/.test(v.photo) ? v.photo : `/uploads/${v.photo}`) : null,
      })),
      plan: pl && {
        code: pl.code,
        name: pl.name,
        endsAt: pl.ends_at,
        daysLeft: pl.days_left,
        contactsLeft: pl.remaining_contacts,
        contactLimit: pl.contact_limit,
      },
    });
  } catch (e) {
    console.error("[dashboard/insights]", e);
    return NextResponse.json({ error: "Failed to load insights" }, { status: 500 });
  }
}
