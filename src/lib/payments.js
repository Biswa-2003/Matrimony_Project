import crypto from "node:crypto";
import { query, getClient } from "@/lib/db";
import { applyBonusDays, rewardReferrer } from "@/lib/referrals";

export const GST_RATE = 0.18;

/** Test payments are allowed only in development or when explicitly enabled server-side. */
export const paymentsTestMode = () =>
  process.env.NODE_ENV !== "production" || process.env.PAYMENTS_TEST_MODE === "true";

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export async function getPlanByCode(code) {
  const { rows } = await query(
    `SELECT id, code, name, price_inr, duration_days, contact_limit FROM public.plans WHERE UPPER(code) = UPPER($1) LIMIT 1`,
    [String(code || "").trim()]
  );
  return rows[0] || null;
}

/** Price incl. 18% GST, in paise. */
export const amountPaiseFor = (plan) => Math.round(Number(plan.price_inr) * (1 + GST_RATE) * 100);

/** Create a Razorpay order via REST (no SDK needed). */
export async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.description || `Razorpay order failed (${res.status})`);
  return json;
}

/** Constant-time check of Razorpay's payment signature. */
export function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Activate or extend a subscription for `userId` on `plan`, in one transaction.
 * Extends from the later of now / current expiry and stacks remaining contacts.
 */
export async function activatePlan(userId, plan) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const active = (
      await client.query(
        `SELECT id FROM public.subscriptions WHERE user_id = $1 AND ends_at >= NOW() ORDER BY ends_at DESC LIMIT 1 FOR UPDATE`,
        [userId]
      )
    ).rows[0];

    let row;
    if (active) {
      row = (
        await client.query(
          `UPDATE public.subscriptions
              SET plan_id = $2,
                  ends_at = GREATEST(ends_at, NOW()) + ($3 || ' days')::interval,
                  remaining_contacts = remaining_contacts + $4
            WHERE id = $1
        RETURNING id, user_id, plan_id, starts_at, ends_at, remaining_contacts`,
          [active.id, plan.id, String(plan.duration_days), plan.contact_limit]
        )
      ).rows[0];
    } else {
      row = (
        await client.query(
          `INSERT INTO public.subscriptions (id, user_id, plan_id, starts_at, ends_at, remaining_contacts, created_at)
           VALUES ($1, $2, $3, NOW(), NOW() + ($4 || ' days')::interval, $5, NOW())
        RETURNING id, user_id, plan_id, starts_at, ends_at, remaining_contacts`,
          [crypto.randomUUID(), userId, plan.id, String(plan.duration_days), plan.contact_limit]
        )
      ).rows[0];
    }
    await client.query("COMMIT");
    const bonusDays = await applyBonusDays(userId, row.id); // days earned by inviting friends
    await rewardReferrer(userId); // first purchase → their inviter earns days
    return { ...row, code: plan.code, mode: active ? "extend" : "new", bonusDays };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
