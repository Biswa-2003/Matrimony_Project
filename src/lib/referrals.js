// src/lib/referrals.js — "invite a friend": the referrer earns bonus days when a friend buys their first plan.
import crypto from "crypto";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { esc, layout, siteUrl, notifyLater } from "@/lib/mailer";

export const REWARD_DAYS = 15;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion

export const normRef = (c) => String(c || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

export async function ensureReferralCode(userId) {
  await ensureSchema();
  const cur = await query(`SELECT referral_code FROM users WHERE id = $1`, [userId]);
  if (cur.rows[0]?.referral_code) return cur.rows[0].referral_code;
  for (let i = 0; i < 6; i++) {
    const code = "MM" + Array.from({ length: 6 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");
    try {
      const { rows } = await query(
        `UPDATE users SET referral_code = $2 WHERE id = $1 AND referral_code IS NULL RETURNING referral_code`,
        [userId, code]
      );
      if (rows[0]) return rows[0].referral_code;
      const again = await query(`SELECT referral_code FROM users WHERE id = $1`, [userId]);
      if (again.rows[0]?.referral_code) return again.rows[0].referral_code;
    } catch (e) {
      if (!/duplicate|unique/i.test(e.message)) throw e; // code collision → try another
    }
  }
  throw new Error("Could not create a referral code.");
}

/** Link a new member to whoever invited them (once, never to themselves). */
export async function recordReferral(refereeId, rawCode) {
  try {
    const code = normRef(rawCode);
    if (!code) return false;
    await ensureSchema();
    const { rows } = await query(`SELECT id FROM users WHERE referral_code = $1`, [code]);
    const referrer = rows[0]?.id;
    if (!referrer || String(referrer) === String(refereeId)) return false;
    const ins = await query(
      `INSERT INTO referrals (referee_id, referrer_id) VALUES ($1, $2) ON CONFLICT (referee_id) DO NOTHING RETURNING 1`,
      [refereeId, referrer]
    );
    return ins.rows.length > 0;
  } catch (e) {
    console.error("[referrals] record failed:", e.message);
    return false;
  }
}

/** Called after a member's plan is activated: reward their referrer once. Never throws. */
export async function rewardReferrer(refereeId) {
  try {
    await ensureSchema();
    const { rows } = await query(
      `UPDATE referrals SET rewarded_at = NOW(), reward_days = $2
        WHERE referee_id = $1 AND rewarded_at IS NULL RETURNING referrer_id`,
      [refereeId, REWARD_DAYS]
    );
    const referrer = rows[0]?.referrer_id;
    if (!referrer) return false;
    // extend an active plan straight away; otherwise bank the days for their next plan
    const ext = await query(
      `UPDATE subscriptions SET ends_at = ends_at + ($2 || ' days')::interval
        WHERE id = (SELECT id FROM subscriptions WHERE user_id = $1 AND ends_at >= NOW() ORDER BY ends_at DESC LIMIT 1)
        RETURNING id`,
      [referrer, String(REWARD_DAYS)]
    );
    if (!ext.rows.length) await query(`UPDATE users SET bonus_days = bonus_days + $2 WHERE id = $1`, [referrer, REWARD_DAYS]);

    notifyLater(referrer, {
      kind: "referral_reward", ref: String(refereeId),
      build: async ({ firstName }) => ({
        subject: `You earned ${REWARD_DAYS} free days on MatriMoney 🎁`,
        text: `Namaste ${firstName}, a friend you invited just joined a MatriMoney plan, so you've earned ${REWARD_DAYS} free premium days.`,
        html: layout({
          preheader: "Thank you for inviting a friend",
          title: `${REWARD_DAYS} free days are yours 🎁`,
          body: `<p style="margin:0 0 12px">Namaste ${esc(firstName)},</p>
                 <p style="margin:0 0 12px">A friend you invited has just upgraded on MatriMoney. As a thank-you, we've added <strong>${REWARD_DAYS} premium days</strong> ${ext.rows.length ? "to your current plan" : "to your account — they'll be added automatically to your next plan"}.</p>`,
          cta: { label: "Invite more friends", href: `${siteUrl()}/dashboard/refer` },
        }),
      }),
    });
    return true;
  } catch (e) {
    console.error("[referrals] reward failed:", e.message);
    return false;
  }
}

/** Apply banked bonus days to a just-activated subscription. */
export async function applyBonusDays(userId, subscriptionId) {
  try {
    // take the banked days and zero them in one statement (row-locked, so two activations can't both use them)
    const { rows } = await query(
      `WITH old AS (SELECT bonus_days FROM users WHERE id = $1 FOR UPDATE)
       UPDATE users SET bonus_days = 0 FROM old WHERE users.id = $1 AND old.bonus_days > 0
       RETURNING old.bonus_days AS d`,
      [userId]
    );
    const days = Number(rows[0]?.d || 0);
    if (days > 0) await query(`UPDATE subscriptions SET ends_at = ends_at + ($2 || ' days')::interval WHERE id = $1`, [subscriptionId, String(days)]);
    return days;
  } catch (e) {
    console.error("[referrals] bonus apply failed:", e.message);
    return 0;
  }
}
