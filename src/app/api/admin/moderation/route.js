// src/app/api/admin/moderation/route.js  (admins only)
//   GET ?tab=messages|profiles|accounts|audit
//   POST { action: 'dismiss'|'warn'|'suspend'|'ban'|'unban', kind?: 'message'|'profile', id?, userId, reason?, days? }
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin, getAuthPayload } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { logAdmin } from "@/lib/admin-audit";
import { revokeAllSessions } from "@/lib/sessions";
import { notifyLater, layout, esc, siteUrl } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const denied = () => NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
const NAME = `COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), u.email)`;

export async function GET(req) {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const tab = new URL(req.url).searchParams.get("tab") || "messages";

  const counts = (await query(
    `SELECT (SELECT COUNT(*)::int FROM messages WHERE flagged AND reviewed_at IS NULL AND deleted_at IS NULL) AS messages,
            (SELECT COUNT(*)::int FROM content_flags WHERE status = 'open') AS profiles,
            (SELECT COUNT(*)::int FROM users WHERE banned_at IS NOT NULL OR suspended_until > NOW()) AS accounts`
  )).rows[0];

  let items = [];
  if (tab === "messages") {
    // only messages our filters flagged are visible to admins — never whole conversations
    items = (await query(
      `SELECT m.id, m.body, m.flag_reason, m.created_at, m.sender_id AS user_id,
              ${NAME} AS name, mp.matri_id,
              (SELECT COUNT(*)::int FROM messages x WHERE x.sender_id = m.sender_id AND x.flagged) AS sender_flags,
              (SELECT COUNT(*)::int FROM member_warnings w WHERE w.user_id = m.sender_id) AS warnings
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN matrimony_profiles mp ON mp.user_id = m.sender_id
        WHERE m.flagged AND m.reviewed_at IS NULL AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC LIMIT 100`
    )).rows;
  } else if (tab === "profiles") {
    items = (await query(
      `SELECT f.id, f.field, f.excerpt, f.reasons, f.created_at, f.user_id, ${NAME} AS name, mp.matri_id,
              (SELECT COUNT(*)::int FROM member_warnings w WHERE w.user_id = f.user_id) AS warnings
         FROM content_flags f JOIN users u ON u.id = f.user_id LEFT JOIN matrimony_profiles mp ON mp.user_id = f.user_id
        WHERE f.status = 'open' ORDER BY f.created_at DESC LIMIT 100`
    )).rows;
  } else if (tab === "accounts") {
    items = (await query(
      `SELECT u.id AS user_id, ${NAME} AS name, mp.matri_id, u.banned_at, u.suspended_until, u.moderation_reason
         FROM users u LEFT JOIN matrimony_profiles mp ON mp.user_id = u.id
        WHERE u.banned_at IS NOT NULL OR u.suspended_until > NOW()
        ORDER BY COALESCE(u.banned_at, u.suspended_until) DESC LIMIT 200`
    )).rows;
  } else if (tab === "audit") {
    items = (await query(
      `SELECT a.id, a.action, a.details, a.created_at,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', am.first_name, am.last_name)), ''), au.email, 'system') AS admin_name,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', tm.first_name, tm.last_name)), ''), tu.email) AS target_name, tm.matri_id AS target_matri
         FROM admin_audit a
         LEFT JOIN users au ON au.id = a.admin_id LEFT JOIN matrimony_profiles am ON am.user_id = a.admin_id
         LEFT JOIN users tu ON tu.id = a.target_user_id LEFT JOIN matrimony_profiles tm ON tm.user_id = a.target_user_id
        ORDER BY a.created_at DESC LIMIT 200`
    )).rows;
  }
  return NextResponse.json({ tab, counts, items });
}

function warnEmail(userId, reason) {
  notifyLater(userId, {
    kind: "warning", ref: String(Date.now()),
    build: async ({ firstName }) => ({
      subject: "Important: a note about your MatriMoney account",
      text: `Namaste ${firstName}, our safety team reviewed activity on your account: ${reason}. Please follow our community guidelines: ${siteUrl()}/matrimoney/safety`,
      html: layout({
        preheader: "A note from the MatriMoney safety team",
        title: "A note from our safety team",
        body: `<p style="margin:0 0 12px">Namaste ${esc(firstName)},</p>
               <p style="margin:0 0 12px">Our safety team reviewed recent activity on your account and found: <strong>${esc(reason)}</strong>.</p>
               <p style="margin:0 0 12px">To keep MatriMoney safe for families, please follow our community guidelines. Repeated issues can lead to suspension.</p>`,
        cta: { label: "Read the guidelines", href: `${siteUrl()}/matrimoney/safety` },
      }),
    }),
  });
}

async function closeItem(kind, id) {
  if (!id) return;
  if (kind === "message") await query(`UPDATE messages SET reviewed_at = NOW() WHERE id = $1`, [id]);
  if (kind === "profile") await query(`UPDATE content_flags SET status = 'reviewed', reviewed_at = NOW() WHERE id = $1`, [id]);
}

export async function POST(req) {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const me = (await getAuthPayload())?.id;
  const { action, kind, id, userId, reason, days } = await req.json().catch(() => ({}));
  const why = String(reason || "").trim().slice(0, 300);

  if (userId && String(userId) === String(me) && action !== "dismiss") {
    return NextResponse.json({ error: "You can't moderate your own account." }, { status: 400 });
  }
  if (userId) {
    const target = await query(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (!target.rows[0]) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    if (target.rows[0].role === "admin" && ["suspend", "ban"].includes(action)) {
      return NextResponse.json({ error: "Remove admin access before suspending this account." }, { status: 400 });
    }
  }

  switch (action) {
    case "dismiss":
      await closeItem(kind, id);
      await logAdmin("moderation.dismiss", userId || null, { kind, id }, me);
      return NextResponse.json({ ok: true, message: "Marked as reviewed." });

    case "warn": {
      if (!userId || !why) return NextResponse.json({ error: "A reason is required." }, { status: 400 });
      await query(`INSERT INTO member_warnings (user_id, reason, created_by) VALUES ($1, $2, $3)`, [userId, why, me]);
      await closeItem(kind, id);
      warnEmail(userId, why);
      await logAdmin("member.warn", userId, { reason: why, kind, id }, me);
      return NextResponse.json({ ok: true, message: "Warning sent to the member." });
    }

    case "suspend": {
      const d = Math.min(Math.max(parseInt(days, 10) || 7, 1), 365);
      if (!userId || !why) return NextResponse.json({ error: "A reason is required." }, { status: 400 });
      await query(
        `UPDATE users SET suspended_until = NOW() + ($2 || ' days')::interval, moderation_reason = $3 WHERE id = $1`,
        [userId, String(d), why]
      );
      await revokeAllSessions(userId);
      await closeItem(kind, id);
      await logAdmin("member.suspend", userId, { days: d, reason: why, kind, id }, me);
      return NextResponse.json({ ok: true, message: `Suspended for ${d} day${d > 1 ? "s" : ""} and signed out everywhere.` });
    }

    case "ban": {
      if (!userId || !why) return NextResponse.json({ error: "A reason is required." }, { status: 400 });
      await query(`UPDATE users SET banned_at = NOW(), moderation_reason = $2 WHERE id = $1`, [userId, why]);
      await query(`UPDATE matrimony_profiles SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1`, [userId]);
      await revokeAllSessions(userId);
      await closeItem(kind, id);
      await logAdmin("member.ban", userId, { reason: why, kind, id }, me);
      return NextResponse.json({ ok: true, message: "Account closed, hidden from members and signed out everywhere." });
    }

    case "unban": {
      if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
      await query(`UPDATE users SET banned_at = NULL, suspended_until = NULL, moderation_reason = NULL WHERE id = $1`, [userId]);
      await query(`UPDATE matrimony_profiles SET is_active = TRUE, updated_at = NOW() WHERE user_id = $1`, [userId]);
      await logAdmin("member.restore", userId, { reason: why || null }, me);
      return NextResponse.json({ ok: true, message: "Account restored." });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
