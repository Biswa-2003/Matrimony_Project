// GET → business metrics for the admin Insights page (admins only)
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
  await ensureSchema();
  const one = (sql, p = []) => query(sql, p).then((r) => r.rows[0] || {}).catch((e) => { console.error("[insights]", e.message); return {}; });
  const many = (sql, p = []) => query(sql, p).then((r) => r.rows).catch((e) => { console.error("[insights]", e.message); return []; });

  const [revenue, byPlan, monthly, members, funnel, engagement, renewals, errors, errorCount] = await Promise.all([
    one(`SELECT
           COALESCE(SUM(amount_paise) FILTER (WHERE paid_at > NOW() - INTERVAL '30 days'), 0)::bigint AS last30,
           COALESCE(SUM(amount_paise) FILTER (WHERE paid_at <= NOW() - INTERVAL '30 days' AND paid_at > NOW() - INTERVAL '60 days'), 0)::bigint AS prev30,
           COALESCE(SUM(amount_paise), 0)::bigint AS total,
           COUNT(*)::int AS orders
         FROM payments WHERE status = 'paid'`),
    many(`SELECT p.name, p.price_inr, COUNT(pay.id)::int AS orders, COALESCE(SUM(pay.amount_paise), 0)::bigint AS paise,
                 (SELECT COUNT(*)::int FROM subscriptions s WHERE s.plan_id = p.id AND s.ends_at >= NOW()) AS active
            FROM plans p LEFT JOIN payments pay ON pay.plan_id = p.id AND pay.status = 'paid'
           GROUP BY p.id, p.name, p.price_inr ORDER BY p.price_inr`),
    many(`SELECT to_char(m, 'Mon YY') AS label, COALESCE(SUM(pay.amount_paise), 0)::bigint AS paise
            FROM generate_series(date_trunc('month', NOW()) - INTERVAL '5 months', date_trunc('month', NOW()), INTERVAL '1 month') m
            LEFT JOIN payments pay ON pay.status = 'paid' AND date_trunc('month', pay.paid_at) = m
           GROUP BY m ORDER BY m`),
    one(`SELECT
           (SELECT COUNT(*)::int FROM users WHERE COALESCE(role,'user') <> 'admin') AS total,
           (SELECT COUNT(*)::int FROM users WHERE COALESCE(role,'user') <> 'admin' AND created_at > NOW() - INTERVAL '30 days') AS new30,
           (SELECT COUNT(*)::int FROM users WHERE COALESCE(role,'user') <> 'admin' AND last_login_at > NOW() - INTERVAL '7 days') AS active7,
           (SELECT COUNT(DISTINCT user_id)::int FROM subscriptions WHERE ends_at >= NOW()) AS paying`),
    one(`SELECT
           (SELECT COUNT(*)::int FROM matrimony_profiles) AS profiles,
           (SELECT COUNT(DISTINCT profile_id)::int FROM photos) AS with_photo,
           (SELECT COUNT(DISTINCT from_profile)::int FROM interests) AS sent_interest,
           (SELECT COUNT(DISTINCT u)::int FROM (SELECT from_profile u FROM interests WHERE status='accepted' UNION SELECT to_profile FROM interests WHERE status='accepted') x) AS connected,
           (SELECT COUNT(DISTINCT user_id)::int FROM subscriptions) AS ever_paid`),
    one(`SELECT
           (SELECT COUNT(*)::int FROM interests WHERE created_at > NOW() - INTERVAL '30 days') AS interests,
           (SELECT COUNT(*)::int FROM interests WHERE status = 'accepted' AND updated_at > NOW() - INTERVAL '30 days') AS accepted,
           (SELECT COUNT(*)::int FROM interests WHERE status IN ('accepted','declined') AND updated_at > NOW() - INTERVAL '30 days') AS answered,
           (SELECT COUNT(*)::int FROM messages WHERE created_at > NOW() - INTERVAL '30 days') AS messages,
           (SELECT COUNT(*)::int FROM conversations WHERE created_at > NOW() - INTERVAL '30 days') AS chats,
           (SELECT COUNT(*)::int FROM contact_unlocks WHERE created_at > NOW() - INTERVAL '30 days') AS unlocks,
           (SELECT COUNT(*)::int FROM photo_requests WHERE created_at > NOW() - INTERVAL '30 days') AS photo_requests`),
    many(`SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), u.email) AS name, mp.matri_id, p.name AS plan, s.ends_at, s.remaining_contacts
            FROM subscriptions s JOIN users u ON u.id = s.user_id LEFT JOIN matrimony_profiles mp ON mp.user_id = s.user_id JOIN plans p ON p.id = s.plan_id
           WHERE s.ends_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' ORDER BY s.ends_at LIMIT 20`),
    many(`SELECT source, message, path, COUNT(*)::int AS n, MAX(created_at) AS last
            FROM app_errors WHERE created_at > NOW() - INTERVAL '7 days'
           GROUP BY source, message, path ORDER BY last DESC LIMIT 15`),
    one(`SELECT COUNT(*)::int AS day FROM app_errors WHERE created_at > NOW() - INTERVAL '24 hours'`),
  ]);

  return NextResponse.json({ revenue, byPlan, monthly, members, funnel, engagement, renewals, errors, errors24h: errorCount.day || 0 });
}
