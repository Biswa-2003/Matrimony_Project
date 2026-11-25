// src/lib/emails.js
// Notification emails. Each helper is fire-and-forget and respects the member's preferences.
import { query } from "@/lib/db";
import { esc, layout, siteUrl, notifyLater } from "@/lib/mailer";

/** Public card info for the member who triggered the email. */
async function cardOf(userId) {
  const { rows } = await query(
    `SELECT mp.matri_id,
            COALESCE(NULLIF(TRIM(mp.first_name), ''), 'A member') AS first_name,
            CAST(date_part('year', age(mp.dob)) AS int) AS age, ci.name AS city
       FROM matrimony_profiles mp LEFT JOIN cities ci ON ci.id = mp.city_id
      WHERE mp.user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

const line = (c) => [c?.age && `${c.age} yrs`, c?.city].filter(Boolean).join(" · ");

/** Someone sent `toId` an interest. */
export function emailInterestReceived(fromId, toId) {
  notifyLater(toId, {
    kind: "interest", ref: String(fromId), throttleHours: 24 * 30,
    build: async ({ firstName }) => {
      const c = await cardOf(fromId);
      if (!c) return null;
      return {
        subject: `${c.first_name} is interested in your profile`,
        text: `Namaste ${firstName}, ${c.first_name} (${line(c)}) sent you an interest on MatriMoney. Reply here: ${siteUrl()}/matrimoney/interests?filter=received`,
        html: layout({
          preheader: `${c.first_name} would like to connect with you.`,
          title: "You have a new interest 💌",
          body: `<p style="margin:0 0 12px">Namaste ${esc(firstName)},</p>
                 <p style="margin:0 0 12px"><strong>${esc(c.first_name)}</strong>${line(c) ? ` (${esc(line(c))})` : ""} has sent you an interest. Take a look at the profile and reply — families appreciate a quick response.</p>`,
          cta: { label: "View & reply", href: `${siteUrl()}/matrimoney/interests?filter=received` },
        }),
      };
    },
  });
}

/** `accepterId` accepted the interest that `senderId` sent. */
export function emailInterestAccepted(accepterId, senderId) {
  notifyLater(senderId, {
    kind: "accepted", ref: String(accepterId), throttleHours: 24 * 30,
    build: async ({ firstName }) => {
      const c = await cardOf(accepterId);
      if (!c) return null;
      return {
        subject: `${c.first_name} accepted your interest 🎉`,
        text: `Good news ${firstName}! ${c.first_name} accepted your interest. Start chatting: ${siteUrl()}/dashboard/messages?with=${c.matri_id}`,
        html: layout({
          preheader: "You're now connected — say hello!",
          title: "Your interest was accepted 🎉",
          body: `<p style="margin:0 0 12px">Good news, ${esc(firstName)}!</p>
                 <p style="margin:0 0 12px"><strong>${esc(c.first_name)}</strong>${line(c) ? ` (${esc(line(c))})` : ""} accepted your interest. You're now connected and can message each other on MatriMoney.</p>`,
          cta: { label: "Say hello", href: `${siteUrl()}/dashboard/messages?with=${c.matri_id}` },
        }),
      };
    },
  });
}

/** New chat message — at most one email per conversation every 6 hours, and only if still unread. */
export function emailNewMessage(senderId, recipientId, conversationId) {
  notifyLater(recipientId, {
    kind: "message", ref: String(conversationId), pref: "alert_messages", throttleHours: 6,
    build: async ({ firstName }) => {
      // skip if the recipient has already read it (e.g. the message was unsent, or they were online)
      const unread = await query(
        `SELECT COUNT(*)::int AS n FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND read_at IS NULL AND deleted_at IS NULL`,
        [conversationId, senderId]
      );
      if (!unread.rows[0]?.n) return null;
      const c = await cardOf(senderId);
      if (!c) return null;
      return {
        subject: `New message from ${c.first_name}`,
        text: `Namaste ${firstName}, ${c.first_name} sent you a message on MatriMoney: ${siteUrl()}/dashboard/messages?with=${c.matri_id}`,
        // message text is deliberately NOT included in the email (privacy + scam prevention)
        html: layout({
          preheader: `${c.first_name} sent you a message.`,
          title: "You have a new message 💬",
          body: `<p style="margin:0 0 12px">Namaste ${esc(firstName)},</p>
                 <p style="margin:0 0 12px"><strong>${esc(c.first_name)}</strong> sent you ${unread.rows[0].n > 1 ? `${unread.rows[0].n} messages` : "a message"}. For your privacy, messages can only be read on MatriMoney.</p>`,
          cta: { label: "Read message", href: `${siteUrl()}/dashboard/messages?with=${c.matri_id}` },
        }),
      };
    },
  });
}

/** `requesterId` asked `ownerId` to add / share photos. */
export function emailPhotoRequest(requesterId, ownerId) {
  notifyLater(ownerId, {
    kind: "photo_request", ref: String(requesterId), throttleHours: 24 * 30,
    build: async ({ firstName }) => {
      const c = await cardOf(requesterId);
      if (!c) return null;
      return {
        subject: `${c.first_name} would like to see your photo`,
        text: `Namaste ${firstName}, ${c.first_name} requested your photo on MatriMoney: ${siteUrl()}/dashboard/upload-photo`,
        html: layout({
          preheader: "Profiles with photos get far more responses.",
          title: "Photo request 📷",
          body: `<p style="margin:0 0 12px">Namaste ${esc(firstName)},</p>
                 <p style="margin:0 0 12px"><strong>${esc(c.first_name)}</strong>${line(c) ? ` (${esc(line(c))})` : ""} would like to see your photo. Adding a clear photo helps families decide — you can keep it visible only to members you accept.</p>`,
          cta: { label: "Add or share photos", href: `${siteUrl()}/dashboard/upload-photo` },
        }),
      };
    },
  });
}
