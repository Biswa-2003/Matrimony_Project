import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

/**
 * Test-mode stub: validates the plan and tells the client to simulate capture.
 * UI expects { test: true } to branch into /api/payments/simulate-capture.
 */
export async function POST(req) {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planCode = (body?.plan_code || "").trim();
  if (!planCode) {
    return NextResponse.json({ error: "plan_code required" }, { status: 400 });
  }

  // Validate plan exists
  const { rows } = await query(
    `SELECT id, code, name, price_inr, duration_days, contact_limit
     FROM public.plans
     WHERE UPPER(code) = UPPER($1)
     LIMIT 1`,
    [planCode]
  );
  if (!rows[0]) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Test mode: no real order created
  return NextResponse.json({ test: true });
}
