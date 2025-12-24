// src/app/api/profile/alerts/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { alertEmail, alertSms } = await req.json();

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await pool.query(
      `
      INSERT INTO user_preferences (user_id, alert_email, alert_sms)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET alert_email = EXCLUDED.alert_email,
                    alert_sms   = EXCLUDED.alert_sms
      `,
      [userId, !!alertEmail, !!alertSms]
    );

    return NextResponse.json({ message: "Alert settings updated." });
  } catch (err) {
    console.error("alerts error:", err);
    return NextResponse.json(
      { error: "Server error while saving alert settings." },
      { status: 500 }
    );
  }
}
