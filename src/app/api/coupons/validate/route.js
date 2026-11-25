// POST { code, plan_code } → price preview with the coupon applied
import { NextResponse } from "next/server";
import { getUserIdFromCookie } from "@/lib/auth";
import { limitOr429 } from "@/lib/rate-limit";
import { getPlanByCode } from "@/lib/payments";
import { validateCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getUserIdFromCookie();
  if (!me) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  // stop code-guessing
  const limited = limitOr429(`coupon-check:${me}`, 15, 10 * 60 * 1000, "Too many coupon attempts. Please wait a few minutes.");
  if (limited) return limited;
  const { code, plan_code } = await req.json().catch(() => ({}));
  const plan = await getPlanByCode(plan_code);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  const v = await validateCoupon(code, plan, me);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    code: v.coupon.code,
    description: v.coupon.description,
    base: v.price.basePaise,
    discount: v.price.discountPaise,
    total: v.price.totalPaise,
  });
}
