// src/app/api/messages/route.js
// Member-to-member chat. Only CONNECTED members (an accepted interest, either direction)
// who haven't blocked each other can message. Polling-based (works on serverless).
//
//   GET                              → { unread, conversations[] }   (inbox, incl. connections with no messages yet)
//   GET ?with=MATRI[&after=ISO]      → { partner, messages[], canMessage, reason }  (marks incoming as read)
//   GET ?with=MATRI&before=ISO       → older page of messages
//   GET ?count=1                     → { unread }   (cheap badge poll)
//   POST { to: MATRI, body }         → { message }
//   DELETE ?id=MESSAGE_ID            → unsend your own message
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema, isBlockedBetween } from "@/lib/schema";
import { photoUrl } from "@/lib/members";
import { limitOr429, rateLimit } from "@/lib/rate-limit";
import { scanText, cleanText } from "@/lib/moderation";
import { emailNewMessage } from "@/lib/emails";

export const dynamic = "force-dynamic";

const PAGE = 40;
const MAX_LEN = 1000;

const pair = (a, b) => (String(a) < String(b) ? [a, b] : [b, a]);

async function partnerByMatri(matriId) {
  const { rows } = await query(
    `SELECT mp.user_id, mp.matri_id, mp.gender, COALESCE(mp.is_active, TRUE) AS is_active,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), mp.matri_id) AS name,
            CAST(date_part('year', age(mp.dob)) AS int) AS age, ci.name AS city,
            u.last_login_at,
            (SELECT ph.path FROM photos ph WHERE ph.profile_id = mp.id ORDER BY ph.is_primary DESC, ph.created_at DESC LIMIT 1) AS photo
       FROM matrimony_profiles mp
       JOIN users u ON u.id = mp.user_id
       LEFT JOIN cities ci ON ci.id = mp.city_id
      WHERE UPPER(mp.matri_id) = UPPER($1) LIMIT 1`,
    [String(matriId || "").trim()]
  );
  const p = rows[0];
  return p ? { ...p, photo: photoUrl(p.photo) } : null;
}

async function isConnected(me, other) {
  const { rows } = await query(
    `SELECT 1 FROM interests
      WHERE status = 'accepted'
        AND ((from_profile = $1 AND to_profile = $2) OR (from_profile = $2 AND to_profile = $1))
      LIMIT 1`,
    [me, other]
  );
  return rows.length > 0;
}

/** Can `me` message `partner`? → { ok, reason } */
async function permission(me, partner) {
  if (!partner) return { ok: false, reason: "This member could not be found." };
  if (String(partner.user_id) === String(me)) return { ok: false, reason: "You can't message yourself." };
  if (!partner.is_active) return { ok: false, reason: "This member has paused their profile." };
  if (await isBlockedBetween(me, partner.user_id)) return { ok: false, blocked: true, reason: "You can't message this member." };
  if (!(await isConnected(me, partner.user_id)))
    return { ok: false, reason: "You can message members once they accept your interest (or you accept theirs)." };
  return { ok: true };
}

async function conversationId(me, other, create) {
  const [a, b] = pair(me, other);
  const found = await query(`SELECT id FROM conversations WHERE user_a = $1 AND user_b = $2`, [a, b]);
  if (found.rows[0] || !create) return found.rows[0]?.id || null;
  const { rows } = await query(
    `INSERT INTO conversations (user_a, user_b) VALUES ($1, $2)
     ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a
     RETURNING id`,
    [a, b]
  );
  return rows[0].id;
}

const shape = (m, me) => ({
  id: m.id,
  mine: String(m.sender_id) === String(me),
  body: m.deleted_at ? "" : m.body,
  deleted: Boolean(m.deleted_at),
  at: m.created_at,
  read: Boolean(m.read_at),
  // the recipient sees a safety tip on risky messages; the sender just sees their text
  warning: m.flagged && String(m.sender_id) !== String(me) && !m.deleted_at ? m.flag_reason : null,
});

async function unreadCount(me) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
      WHERE (c.user_a = $1 OR c.user_b = $1) AND m.sender_id <> $1
        AND m.read_at IS NULL AND m.deleted_at IS NULL`,
    [me]
  );
  return rows[0]?.n || 0;
}

/* ------------------------------------------------------------------ GET */
export async function GET(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const sp = new URL(req.url).searchParams;

  if (sp.get("count")) return NextResponse.json({ unread: await unreadCount(me) });

  /* ---------- one thread ---------- */
  const withId = sp.get("with");
  if (withId) {
    const partner = await partnerByMatri(withId);
    const perm = await permission(me, partner);
    if (!partner) return NextResponse.json({ error: perm.reason }, { status: 404 });

    // after a block, neither side can read the old conversation
    const convId = perm.blocked ? null : await conversationId(me, partner.user_id, false);
    let messages = [];
    let hasMore = false;
    if (convId) {
      const after = sp.get("after");
      const before = sp.get("before");
      let rows;
      if (after) {
        ({ rows } = await query(
          `SELECT * FROM messages WHERE conversation_id = $1 AND created_at > $2::timestamptz ORDER BY created_at ASC LIMIT 200`,
          [convId, after]
        ));
      } else {
        ({ rows } = await query(
          `SELECT * FROM messages WHERE conversation_id = $1 ${before ? "AND created_at < $2::timestamptz" : ""}
            ORDER BY created_at DESC LIMIT ${PAGE + 1}`,
          before ? [convId, before] : [convId]
        ));
        hasMore = rows.length > PAGE;
        rows = rows.slice(0, PAGE).reverse();
      }
      messages = rows.map((m) => shape(m, me));

      // opening the thread reads everything sent to me
      await query(
        `UPDATE messages SET read_at = NOW()
          WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
        [convId, me]
      );
    }

    // let the sender's ticks turn blue: ids of MY messages the partner has read
    let readUpTo = null;
    if (convId) {
      const r = await query(
        `SELECT MAX(created_at) AS t FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND read_at IS NOT NULL`,
        [convId, me]
      );
      readUpTo = r.rows[0]?.t || null;
    }

    return NextResponse.json({
      partner: {
        matri_id: partner.matri_id, name: partner.name, gender: partner.gender, photo: partner.photo,
        age: partner.age, city: partner.city, last_active: partner.last_login_at,
      },
      messages,
      hasMore,
      readUpTo,
      canMessage: perm.ok,
      reason: perm.ok ? null : perm.reason,
    });
  }

  /* ---------- inbox ---------- */
  const { rows } = await query(
    `WITH conns AS (
       SELECT CASE WHEN i.from_profile = $1 THEN i.to_profile ELSE i.from_profile END AS other, MAX(i.updated_at) AS connected_at
         FROM interests i
        WHERE i.status = 'accepted' AND (i.from_profile = $1 OR i.to_profile = $1)
        GROUP BY 1
     ),
     convs AS (
       SELECT c.id, CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END AS other, c.last_message_at
         FROM conversations c WHERE c.user_a = $1 OR c.user_b = $1
     ),
     people AS (
       SELECT COALESCE(cv.other, cn.other) AS other, cv.id AS conv_id, cv.last_message_at, cn.connected_at
         FROM convs cv FULL OUTER JOIN conns cn ON cn.other = cv.other
     )
     SELECT p.conv_id, p.last_message_at, p.connected_at,
            mp.matri_id, mp.gender, COALESCE(mp.is_active, TRUE) AS is_active,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mp.first_name, mp.last_name)), ''), mp.matri_id) AS name,
            (SELECT ph.path FROM photos ph WHERE ph.profile_id = mp.id ORDER BY ph.is_primary DESC, ph.created_at DESC LIMIT 1) AS photo,
            lm.body AS last_body, lm.sender_id AS last_sender, lm.deleted_at AS last_deleted, lm.created_at AS last_at,
            (SELECT COUNT(*)::int FROM messages m
              WHERE m.conversation_id = p.conv_id AND m.sender_id <> $1 AND m.read_at IS NULL AND m.deleted_at IS NULL) AS unread
       FROM people p
       JOIN matrimony_profiles mp ON mp.user_id = p.other
       LEFT JOIN LATERAL (
         SELECT body, sender_id, deleted_at, created_at FROM messages m
          WHERE m.conversation_id = p.conv_id ORDER BY m.created_at DESC LIMIT 1
       ) lm ON TRUE
      WHERE NOT EXISTS (SELECT 1 FROM blocks b
              JOIN matrimony_profiles ba ON ba.id = b.blocker_id
              JOIN matrimony_profiles bz ON bz.id = b.blocked_id
             WHERE (ba.user_id = $1 AND bz.user_id = p.other) OR (ba.user_id = p.other AND bz.user_id = $1))
      ORDER BY COALESCE(p.last_message_at, p.connected_at) DESC NULLS LAST
      LIMIT 200`,
    [me]
  );

  const conversations = rows.map((r) => ({
    matri_id: r.matri_id,
    name: r.name,
    gender: r.gender,
    photo: photoUrl(r.photo),
    active: r.is_active,
    unread: r.unread || 0,
    last: r.last_at
      ? { body: r.last_deleted ? "Message unsent" : r.last_body, mine: String(r.last_sender) === String(me), at: r.last_at }
      : null,
    connected_at: r.connected_at,
  }));

  return NextResponse.json({ unread: conversations.reduce((n, c) => n + c.unread, 0), conversations });
}

/* ------------------------------------------------------------------ POST */
export async function POST(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited =
    limitOr429(`msg-burst:${me}`, 20, 60 * 1000, "You're sending messages very fast. Please slow down a little.") ||
    limitOr429(`msg-day:${me}`, 400, 24 * 60 * 60 * 1000, "You've reached today's message limit. Please continue tomorrow.");
  if (limited) return limited;

  await ensureSchema();
  const { to, body } = await req.json().catch(() => ({}));
  const text = cleanText(body, MAX_LEN);
  if (!text) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  if (String(body || "").length > MAX_LEN + 50)
    return NextResponse.json({ error: `Messages can be up to ${MAX_LEN} characters.` }, { status: 400 });

  const partner = await partnerByMatri(to);
  const perm = await permission(me, partner);
  if (!perm.ok) return NextResponse.json({ error: perm.reason }, { status: 403 });

  // opening lines to many different people quickly is a spam pattern
  const convId = await conversationId(me, partner.user_id, false);
  if (!convId && !rateLimit(`msg-new-thread:${me}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "You've started many new chats in a short time. Please try again later." }, { status: 429 });
  }
  const id = convId || (await conversationId(me, partner.user_id, true));

  const scan = scanText(text);
  const reason = scan.flagged
    ? scan.scam
      ? "This message mentions money or payments. Never send money or share OTPs/bank details with anyone you meet online."
      : `This message contains a ${scan.reasons[0]}. Share personal contact details only when you're comfortable.`
    : null;

  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_id, body, flagged, flag_reason)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, me, text, scan.flagged, reason]
  );
  await query(`UPDATE conversations SET last_message_at = NOW() WHERE id = $1`, [id]);
  emailNewMessage(me, partner.user_id, id);

  return NextResponse.json({ message: shape(rows[0], me) }, { status: 201 });
}

/* ------------------------------------------------------------------ DELETE (unsend) */
export async function DELETE(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = limitOr429(`msg-del:${me}`, 30, 10 * 60 * 1000);
  if (limited) return limited;
  await ensureSchema();
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { rows } = await query(
    `UPDATE messages SET deleted_at = NOW() WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL RETURNING id`,
    [id, me]
  );
  if (!rows.length) return NextResponse.json({ error: "Message not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
