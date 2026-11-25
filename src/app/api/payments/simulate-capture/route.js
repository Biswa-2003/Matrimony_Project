import { NextResponse } from "next/server";
import { getUserIdFromCookie } from "@/lib/auth";
import { getPlanByCode, activatePlan, paymentsTestMode } from "@/lib/payments";

import { clientIp, limitOr429 } from "@/lib/rate-limit";
import { validateCoupon, redeemCoupon } from "@/lib/coupons";
export const dynamic = "force-dynamic";

/**
 * TEST MODE ONLY — activates a plan without payment.
 * Disabled in production unless the server-only env var PAYMENTS_TEST_MODE=true is set.
 * (Previously guarded only by an optional NEXT_PUBLIC_ header, which is visible to every browser.)
 */
export async function POST(req) {
  { const limited = limitOr429(`pay-sim:${clientIp(req)}`, 10, 10 * 60 * 1000); if (limited) return limited; }
  if (!paymentsTestMode()) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const plan = await getPlanByCode(body?.plan_code);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    let coupon = null, price = null;
    if (body?.coupon_code) {
      const v = await validateCoupon(body.coupon_code, plan, userId);
      if (!v.ok) return NextResponse.json({ error: v.error, couponError: true }, { status: 400 });
      ({ coupon, price } = v);
    }
    const subscription = await activatePlan(userId, plan);
    if (coupon) await redeemCoupon(coupon.id, userId, price.discountPaise);
    return NextResponse.json({ ok: true, mode: subscription.mode, subscription });
  } catch (e) {
    console.error("[payments] simulate-capture failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
