import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, notBlockedSql } from "@/lib/schema";

export const dynamic = "force-dynamic";

const PHOTO = `LEFT JOIN LATERAL (
  SELECT path FROM photos ph WHERE ph.profile_id = mp.id ORDER BY ph.is_primary DESC, ph.created_at DESC LIMIT 1
) ph ON TRUE`;

/**
 * GET → { count (unread), notifications[] }
 * Types: interest (received, pending), accepted (my interest accepted), declined, view (viewed my profile).
 * "Unread" = newer than users.notifications_seen_at.
 */
export async function GET() {
  const meId = await getUserIdFromCookie();
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureSchema();
    const seenRow = await query(`SELECT notifications_seen_at FROM users WHERE id = $1`, [meId]);
    const seenAt = seenRow.rows[0]?.notifications_seen_at || null;

    const safe = (sql) => query(sql, [meId]).catch((e) => { console.error("[notifications]", e.message); return { rows: [] }; });

    const [received, answered, views] = await Promise.all([
      safe(`SELECT i.id::text, i.created_at AS timestamp, 'interest' AS type, mp.matri_id,
                   COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), 'Member') AS name, mp.gender, ph.path AS photo_path
              FROM interests i JOIN matrimony_profiles mp ON mp.user_id = i.from_profile ${PHOTO}
             WHERE i.to_profile = $1 AND i.status = 'sent' AND i.created_at > NOW() - INTERVAL '30 days'
               AND ${notBlockedSql("$1", "mp.user_id")}
             ORDER BY i.created_at DESC LIMIT 15`),
      safe(`SELECT i.id::text, i.updated_at AS timestamp, CASE WHEN i.status = 'accepted' THEN 'accepted' ELSE 'declined' END AS type, mp.matri_id,
                   COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), 'Member') AS name, mp.gender, ph.path AS photo_path
              FROM interests i JOIN matrimony_profiles mp ON mp.user_id = i.to_profile ${PHOTO}
             WHERE i.from_profile = $1 AND i.status IN ('accepted', 'declined') AND i.updated_at > NOW() - INTERVAL '30 days'
               AND ${notBlockedSql("$1", "mp.user_id")}
             ORDER BY i.updated_at DESC LIMIT 15`),
      safe(`SELECT v.id::text, v.viewed_at AS timestamp, 'view' AS type, mp.matri_id,
                   COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), 'Member') AS name, mp.gender, ph.path AS photo_path
              FROM profile_views v JOIN matrimony_profiles mp ON mp.user_id = v.viewer_id ${PHOTO}
             WHERE v.viewed_id = $1 AND v.viewed_at > NOW() - INTERVAL '14 days'
               AND ${notBlockedSql("$1", "mp.user_id")}
             ORDER BY v.viewed_at DESC LIMIT 15`),
    ]);

    const photoReqs = await safe(`SELECT 'pr-' || r.requester_id::text AS id, r.created_at AS timestamp, 'photo_request' AS type, mp.matri_id,
                   COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), 'Member') AS name, mp.gender, ph.path AS photo_path
              FROM photo_requests r JOIN matrimony_profiles mp ON mp.user_id = r.requester_id ${PHOTO}
             WHERE r.owner_id = $1 AND r.status = 'pending' AND r.created_at > NOW() - INTERVAL '30 days'
               AND ${notBlockedSql("$1", "mp.user_id")}
             ORDER BY r.created_at DESC LIMIT 10`);

    const notifications = [...received.rows, ...answered.rows, ...views.rows, ...photoReqs.rows]
      .map((n) => ({ ...n, unread: !seenAt || new Date(n.timestamp) > new Date(seenAt) }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    const msg = await safe(`SELECT COUNT(*)::int AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
                              WHERE (c.user_a = $1 OR c.user_b = $1) AND m.sender_id <> $1
                                AND m.read_at IS NULL AND m.deleted_at IS NULL`);

    return NextResponse.json({
      ok: true,
      count: notifications.filter((n) => n.unread).length,
      notifications,
      messages: msg.rows[0]?.n || 0,
    });
  } catch (e) {
    console.error("Notifications error:", e);
    return NextResponse.json({ ok: false, count: 0, notifications: [], error: "Failed to fetch notifications" }, { status: 200 });
  }
}

/** POST { action: "seen" } → mark everything up to now as read */
export async function POST(req) {
  const meId = await getUserIdFromCookie();
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureSchema();
    const { action } = await req.json().catch(() => ({}));
    if (action !== "seen") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    await query(`UPDATE users SET notifications_seen_at = NOW() WHERE id = $1`, [meId]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Notifications POST error:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
