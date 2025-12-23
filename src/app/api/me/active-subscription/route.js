// app/api/me/active-subscription/route.js
import { NextResponse } from "next/server";
import { getUserIdFromCookie } from "@/lib/auth";
import { getActiveSubscriptionForUser } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const userId = await getUserIdFromCookie();

  // ✅ keep your previous behaviour: if not logged in, just send active: null
  if (!userId) {
    return NextResponse.json({ active: null });
  }

  // ✅ use shared helper (same SQL as before)
  const active = await getActiveSubscriptionForUser(userId);

  // ✅ keep the same response shape your frontend already uses
  return NextResponse.json({
    active: active || null,
  });
}
