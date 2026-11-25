import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { verifyRazorpaySignature, activatePlan, razorpayConfigured } from "@/lib/payments";

import { clientIp, limitOr429 } from "@/lib/rate-limit";
import { redeemCoupon } from "@/lib/coupons";
export const dynamic = "force-dynamic";

/**
 * POST { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies the signature server-side, marks the payment paid (idempotently) and activates the plan.
 */
export async function POST(req) {
  { const limited = limitOr429(`pay-verify:${clientIp(req)}`, 20, 10 * 60 * 1000); if (limited) return limited; }
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!razorpayConfigured()) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

  try {
    await ensureSchema();
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } =
      await req.json().catch(() => ({}));

    if (!orderId || !paymentId || !verifyRazorpaySignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    // Claim the order exactly once (protects against double activation)
    const claimed = await query(
      `UPDATE payments SET status = 'paid', payment_id = $3, paid_at = NOW()
        WHERE order_id = $1 AND user_id = $2 AND status <> 'paid'
      RETURNING plan_id, coupon_id, discount_paise`,
      [orderId, userId, paymentId]
    );
    if (!claimed.rows.length) {
      const already = await query(`SELECT status FROM payments WHERE order_id = $1 AND user_id = $2`, [orderId, userId]);
      if (already.rows[0]?.status === "paid") return NextResponse.json({ ok: true, alreadyActivated: true });
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const plan = (
      await query(`SELECT id, code, name, price_inr, duration_days, contact_limit FROM plans WHERE id = $1`, [claimed.rows[0].plan_id])
    ).rows[0];
    const subscription = await activatePlan(userId, plan);
    if (claimed.rows[0].coupon_id) await redeemCoupon(claimed.rows[0].coupon_id, userId, claimed.rows[0].discount_paise);
    return NextResponse.json({ ok: true, subscription });
  } catch (e) {
    console.error("[payments] verify failed:", e);
    return NextResponse.json({ error: "Could not confirm the payment. If money was deducted, contact support." }, { status: 500 });
  }
}
