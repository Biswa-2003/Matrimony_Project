// src/app/api/profile/alerts/route.js
// GET  → current notification preferences
// POST { alertEmail?, alertMessages?, alertDigest?, alertSms? } → update (only the keys sent)
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { clientIp, limitOr429 } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const FIELDS = { alertEmail: "alert_email", alertMessages: "alert_messages", alertDigest: "alert_digest", alertSms: "alert_sms" };

async function read(userId) {
  const { rows } = await query(
    `SELECT alert_email, alert_messages, alert_digest, alert_sms FROM user_preferences WHERE user_id = $1`,
    [userId]
  );
  const r = rows[0] || {};
  return {
    alertEmail: r.alert_email ?? true,
    alertMessages: r.alert_messages ?? true,
    alertDigest: r.alert_digest ?? true,
    alertSms: r.alert_sms ?? false,
  };
}

export async function GET() {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  await ensureSchema();
  return NextResponse.json(await read(userId));
}

export async function POST(req) {
  { const limited = limitOr429(`profile-settings:${clientIp(req)}`, 20, 10 * 60 * 1000); if (limited) return limited; }
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    await ensureSchema();

    const body = await req.json().catch(() => ({}));
    const current = await read(userId);
    const next = { ...current };
    for (const k of Object.keys(FIELDS)) if (typeof body[k] === "boolean") next[k] = body[k];

    await query(
      `INSERT INTO user_preferences (user_id, alert_email, alert_messages, alert_digest, alert_sms, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         alert_email = EXCLUDED.alert_email, alert_messages = EXCLUDED.alert_messages,
         alert_digest = EXCLUDED.alert_digest, alert_sms = EXCLUDED.alert_sms, updated_at = NOW()`,
      [userId, next.alertEmail, next.alertMessages, next.alertDigest, next.alertSms]
    );
    return NextResponse.json({ message: "Notification settings saved.", ...next });
  } catch (err) {
    console.error("alerts error:", err.message);
    return NextResponse.json({ error: "Server error while saving alert settings." }, { status: 500 });
  }
}
