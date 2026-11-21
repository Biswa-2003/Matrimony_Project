import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    // 1. Fetch available plans
    const plansRes = await query("SELECT * FROM plans ORDER BY price_inr ASC");

    // 2. Fetch all subscriptions with user and plan details
    const subsRes = await query(`
      SELECT 
        s.id,
        s.user_id,
        s.starts_at,
        s.ends_at,
        s.remaining_contacts,
        s.created_at,
        p.id AS plan_id,
        p.name AS plan_name,
        p.code AS plan_code,
        p.price_inr,
        u.email,
        u.phone,
        mp.first_name,
        mp.last_name,
        mp.matri_id,
        CASE WHEN s.ends_at >= NOW() THEN true ELSE false END AS is_active
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN matrimony_profiles mp ON u.id = mp.user_id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      plans: plansRes.rows,
      subscriptions: subsRes.rows,
    });
  } catch (err) {
    console.error("Admin subscriptions GET error:", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const body = await request.json();
    const { userId, planId, durationDays, contactLimit } = body;

    if (!userId || !planId) {
      return NextResponse.json({ error: "User ID and Plan ID are required." }, { status: 400 });
    }

    // Get plan details
    const planRes = await query("SELECT * FROM plans WHERE id = $1", [planId]);
    if (planRes.rows.length === 0) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    const plan = planRes.rows[0];

    const days = parseInt(durationDays || plan.duration_days || "30", 10);
    const contacts = parseInt(contactLimit || plan.contact_limit || "50", 10);

    const subId = crypto.randomUUID();

    await query(
      `
      INSERT INTO subscriptions (id, user_id, plan_id, starts_at, ends_at, remaining_contacts, created_at)
      VALUES ($1, $2, $3, NOW(), NOW() + ($4 || ' days')::interval, $5, NOW())
      `,
      [subId, userId, planId, days, contacts]
    );

    return NextResponse.json({
      success: true,
      message: `Subscription (${plan.name}) granted successfully!`,
      subscriptionId: subId,
    });
  } catch (err) {
    console.error("Admin subscriptions POST error:", err);
    return NextResponse.json({ error: "Failed to grant subscription" }, { status: 500 });
  }
}
