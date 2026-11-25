// src/app/api/cron/weekly-digest/route.js
// Weekly "here's what happened" email. Triggered by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer $CRON_SECRET`. Safe to run more than once: each member gets at most
// one digest every 6 days (email_log), and members who opted out are skipped.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { esc, layout, siteUrl, notifyMember } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 300;

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development"; // never open in production without a secret
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  // members who want the digest and haven't had one in the last 6 days
  const { rows: members } = await query(
    `SELECT u.id, mp.gender
       FROM users u
       JOIN matrimony_profiles mp ON mp.user_id = u.id
       LEFT JOIN user_preferences p ON p.user_id = u.id
      WHERE COALESCE(mp.is_active, TRUE) = TRUE
        AND COALESCE(p.alert_digest, TRUE) = TRUE
        AND COALESCE(u.role, 'user') <> 'admin'
        AND u.email IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM email_log l WHERE l.user_id = u.id AND l.kind = 'digest' AND l.sent_at > NOW() - INTERVAL '6 days')
      ORDER BY u.last_login_at DESC NULLS LAST
      LIMIT ${BATCH}`
  );

  let sent = 0, skipped = 0;
  const preview = [];

  for (const m of members) {
    const opposite = String(m.gender).toLowerCase() === "male" ? "Female" : "Male";
    const stats = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM interests WHERE to_profile = $1 AND status = 'sent') AS pending,
         (SELECT COUNT(*)::int FROM profile_views WHERE viewed_id = $1 AND viewed_at > NOW() - INTERVAL '7 days') AS views,
         (SELECT COUNT(*)::int FROM messages x JOIN conversations c ON c.id = x.conversation_id
           WHERE (c.user_a = $1 OR c.user_b = $1) AND x.sender_id <> $1 AND x.read_at IS NULL AND x.deleted_at IS NULL) AS unread`,
      [m.id]
    ).then((r) => r.rows[0]).catch(() => ({ pending: 0, views: 0, unread: 0 }));

    const fresh = await query(
      `SELECT mp.matri_id, mp.first_name, CAST(date_part('year', age(mp.dob)) AS int) AS age, ci.name AS city
         FROM matrimony_profiles mp LEFT JOIN cities ci ON ci.id = mp.city_id
        WHERE mp.gender = $2 AND COALESCE(mp.is_active, TRUE) = TRUE
          AND mp.created_at > NOW() - INTERVAL '7 days' AND mp.user_id <> $1
          AND NOT EXISTS (SELECT 1 FROM blocks b
                JOIN matrimony_profiles ba ON ba.id = b.blocker_id JOIN matrimony_profiles bz ON bz.id = b.blocked_id
               WHERE (ba.user_id = $1 AND bz.user_id = mp.user_id) OR (ba.user_id = mp.user_id AND bz.user_id = $1))
        ORDER BY mp.created_at DESC LIMIT 4`,
      [m.id, opposite]
    ).then((r) => r.rows).catch(() => []);

    const total = (stats.pending || 0) + (stats.views || 0) + (stats.unread || 0) + fresh.length;
    if (!total) { skipped++; continue; } // nothing to say → don't email

    if (dryRun) { preview.push({ user: m.id, ...stats, newMatches: fresh.length }); continue; }

    const ok = await notifyMember(m.id, {
      kind: "digest", pref: "alert_digest", throttleHours: 24 * 6,
      build: async ({ firstName }) => {
        const rowsHtml = [
          stats.unread ? `💬 <strong>${stats.unread}</strong> unread message${stats.unread > 1 ? "s" : ""}` : null,
          stats.pending ? `💌 <strong>${stats.pending}</strong> interest${stats.pending > 1 ? "s" : ""} waiting for your reply` : null,
          stats.views ? `👀 <strong>${stats.views}</strong> profile visit${stats.views > 1 ? "s" : ""} this week` : null,
        ].filter(Boolean).map((t) => `<li style="margin:4px 0">${t}</li>`).join("");
        const people = fresh.map((p) =>
          `<li style="margin:4px 0"><a href="${siteUrl()}/matrimoney/profile-details/${esc(p.matri_id)}" style="color:#a3123a;font-weight:bold;text-decoration:none">${esc(p.first_name || p.matri_id)}</a> — ${esc([p.age && `${p.age} yrs`, p.city].filter(Boolean).join(", "))}</li>`).join("");
        return {
          subject: stats.pending || stats.unread ? "People are waiting to hear from you" : "New matches joined MatriMoney this week",
          text: `Namaste ${firstName}, your weekly MatriMoney update: ${stats.unread} unread messages, ${stats.pending} interests waiting, ${stats.views} profile visits, ${fresh.length} new matches. ${siteUrl()}/dashboard/myhome`,
          html: layout({
            preheader: "Your weekly MatriMoney update",
            title: "Your week on MatriMoney",
            body: `<p style="margin:0 0 12px">Namaste ${esc(firstName)}, here's what happened this week:</p>
                   ${rowsHtml ? `<ul style="padding-left:18px;margin:0 0 16px">${rowsHtml}</ul>` : ""}
                   ${people ? `<p style="margin:0 0 6px;font-weight:bold;color:#5a0f22">New members you may like</p><ul style="padding-left:18px;margin:0">${people}</ul>` : ""}`,
            cta: { label: "Open MatriMoney", href: `${siteUrl()}/dashboard/myhome` },
            footerNote: "You get this summary at most once a week, and only when there's something new.",
          }),
        };
      },
    });
    ok ? sent++ : skipped++;
  }

  return NextResponse.json({ ok: true, considered: members.length, sent, skipped, ...(dryRun ? { preview: preview.slice(0, 20) } : {}) });
}
