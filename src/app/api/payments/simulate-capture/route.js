import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import crypto from "node:crypto";

/**
 * Test-mode "payment success" → activate/extend subscription.
 * Secured with x-test-secret header (optional but recommended).
 */
export async function POST(req) {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secretHeader = req.headers.get("x-test-secret") || "";
  const expected = process.env.NEXT_PUBLIC_TEST_HEADER || "";
  if (expected && secretHeader !== expected) {
    return NextResponse.json({ error: "Invalid test secret" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const planCode = (body?.plan_code || "").trim();
  if (!planCode) {
    return NextResponse.json({ error: "plan_code required" }, { status: 400 });
  }

  // Get plan by code
  const planRes = await query(
    `SELECT id, code, name, price_inr, duration_days, contact_limit
       FROM public.plans
      WHERE UPPER(code) = UPPER($1)
      LIMIT 1`,
    [planCode]
  );
  const plan = planRes.rows[0];
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock latest active sub if present
    const activeRes = await client.query(
      `
      SELECT id, user_id, plan_id, starts_at, ends_at, remaining_contacts
      FROM public.subscriptions
      WHERE user_id = $1 AND ends_at >= NOW()
      ORDER BY ends_at DESC
      FOR UPDATE
      LIMIT 1
      `,
      [userId]
    );
    const active = activeRes.rows[0];

    if (active) {
      // Extend from the later of (now, existing ends_at) and stack contacts.
      const upd = await client.query(
        `
        UPDATE public.subscriptions
        SET
          plan_id = $2,
          ends_at = GREATEST(ends_at, NOW()) + ($3 || ' days')::interval,
          remaining_contacts = remaining_contacts + $4
        WHERE id = $1
        RETURNING id, user_id, plan_id, starts_at, ends_at, remaining_contacts
        `,
        [active.id, plan.id, String(plan.duration_days), plan.contact_limit]
      );
      await client.query("COMMIT");
      // include plan code in response for your UI
      return NextResponse.json({
        ok: true,
        mode: "extend",
        subscription: { ...upd.rows[0], code: plan.code }
      });
    }

    // No active subscription → create a fresh one
    const newId = crypto.randomUUID();
    const ins = await client.query(
      `
      INSERT INTO public.subscriptions
        (id, user_id, plan_id, starts_at, ends_at, remaining_contacts, created_at)
      VALUES
        ($1, $2, $3, NOW(), NOW() + ($4 || ' days')::interval, $5, NOW())
      RETURNING id, user_id, plan_id, starts_at, ends_at, remaining_contacts
      `,
      [newId, userId, plan.id, String(plan.duration_days), plan.contact_limit]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      ok: true,
      mode: "new",
      subscription: { ...ins.rows[0], code: plan.code }
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
