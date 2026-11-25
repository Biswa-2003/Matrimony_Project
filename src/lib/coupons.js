// src/lib/coupons.js — discount codes for plans
// Discount applies to the plan's base price; GST (18%) is charged on the discounted amount.
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { GST_RATE } from "@/lib/payments";

export const normCode = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 30);

/** Pure price maths (exported for tests). */
export function priceWithCoupon(plan, coupon) {
  const basePaise = Math.round(Number(plan.price_inr) * 100);
  let discount = 0;
  if (coupon) {
    if (coupon.kind === "percent") {
      discount = Math.floor((basePaise * Math.min(100, Number(coupon.value))) / 100);
      if (coupon.max_discount_inr) discount = Math.min(discount, Math.round(Number(coupon.max_discount_inr) * 100));
    } else {
      discount = Math.round(Number(coupon.value) * 100);
    }
    discount = Math.max(0, Math.min(discount, basePaise));
  }
  const net = basePaise - discount;
  return { basePaise, discountPaise: discount, netPaise: net, totalPaise: Math.round(net * (1 + GST_RATE)) };
}

/** → { ok: true, coupon, price } or { ok: false, error } */
export async function validateCoupon(code, plan, userId) {
  await ensureSchema();
  const c = normCode(code);
  if (!c) return { ok: false, error: "Please enter a coupon code." };
  const { rows } = await query(`SELECT * FROM coupons WHERE code = $1`, [c]);
  const coupon = rows[0];
  const now = new Date();
  if (!coupon || !coupon.active) return { ok: false, error: "This coupon code isn't valid." };
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return { ok: false, error: "This coupon isn't active yet." };
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return { ok: false, error: "This coupon has expired." };
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return { ok: false, error: "This coupon has been fully used." };
  if (coupon.plan_codes?.length && !coupon.plan_codes.map((x) => x.toUpperCase()).includes(String(plan.code).toUpperCase())) {
    return { ok: false, error: "This coupon doesn't apply to the selected plan." };
  }
  if (userId) {
    const used = await query(`SELECT 1 FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2`, [coupon.id, userId]);
    if (used.rows.length) return { ok: false, error: "You've already used this coupon." };
  }
  return { ok: true, coupon, price: priceWithCoupon(plan, coupon) };
}

/** Record a redemption once the payment succeeds. Returns false if the coupon ran out meanwhile. */
export async function redeemCoupon(couponId, userId, discountPaise) {
  if (!couponId) return true;
  const ins = await query(
    `INSERT INTO coupon_redemptions (coupon_id, user_id, discount_paise) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING 1`,
    [couponId, userId, discountPaise || 0]
  );
  if (!ins.rows.length) return true; // already recorded
  const upd = await query(
    `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1 AND (max_uses IS NULL OR used_count < max_uses) RETURNING 1`,
    [couponId]
  );
  return upd.rows.length > 0;
}
