import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { clientIp, limitOr429 } from "@/lib/rate-limit";
import {
  getPlanByCode,
  amountPaiseFor,
  razorpayConfigured,
  createRazorpayOrder,
  paymentsTestMode,
  activatePlan,
} from "@/lib/payments";
import { validateCoupon, redeemCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

/**
 * POST { plan_code }
 *  - Razorpay configured → creates a real order and returns { orderId, key, amount, currency }.
 *  - Otherwise, in test mode (dev or PAYMENTS_TEST_MODE=true) → { test: true }.
 *  - Otherwise → 503, so no plan can ever be granted without payment in production.
 */
export async function POST(req) {
  { const limited = limitOr429(`pay-order:${clientIp(req)}`, 10, 10 * 60 * 1000, "Too many payment attempts. Please wait a few minutes."); if (limited) return limited; }
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Please log in to upgrade." }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const plan = await getPlanByCode(body?.plan_code);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    // optional coupon
    let coupon = null;
    let price = null;
    if (body?.coupon_code) {
      const v = await validateCoupon(body.coupon_code, plan, userId);
      if (!v.ok) return NextResponse.json({ error: v.error, couponError: true }, { status: 400 });
      coupon = v.coupon;
      price = v.price;
    }

    // 100% discount → nothing to charge: activate straight away
    if (price && price.totalPaise === 0) {
      await ensureSchema();
      if (!(await redeemCoupon(coupon.id, userId, price.discountPaise))) {
        return NextResponse.json({ error: "This coupon has just been fully used.", couponError: true }, { status: 400 });
      }
      const subscription = await activatePlan(userId, plan);
      return NextResponse.json({ free: true, subscription });
    }

    if (razorpayConfigured()) {
      await ensureSchema();
      const amountPaise = price ? price.totalPaise : amountPaiseFor(plan);
      const order = await createRazorpayOrder({
        amountPaise,
        receipt: `mm_${Date.now()}`,
        notes: { user_id: String(userId), plan_code: plan.code, coupon: coupon?.code || "" },
      });
      await query(
        `INSERT INTO payments (user_id, plan_id, provider, order_id, amount_paise, currency, status, coupon_id, discount_paise)
         VALUES ($1, $2, 'razorpay', $3, $4, 'INR', 'created', $5, $6)`,
        [userId, plan.id, order.id, amountPaise, coupon?.id || null, price?.discountPaise || 0]
      );
      return NextResponse.json({
        orderId: order.id,
        key: process.env.RAZORPAY_KEY_ID,
        amount: amountPaise,
        currency: "INR",
        plan: { code: plan.code, name: plan.name },
      });
    }

    if (paymentsTestMode()) return NextResponse.json({ test: true, amount: price ? price.totalPaise : amountPaiseFor(plan) });

    return NextResponse.json(
      { error: "Online payments are temporarily unavailable. Please contact support to upgrade." },
      { status: 503 }
    );
  } catch (e) {
    console.error("[payments] create-order failed:", e);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
  }
}
