// Admin: help people verify their email during sign-up when the OTP email doesn't arrive.
//   GET                    → pending / recent sign-up codes (codes themselves are hidden)
//   GET ?reveal=EMAIL      → { otp, expires } for one email (logged in the admin audit)
//   POST { email, phone?, minutes? } → issue a fresh code to hand over by phone / WhatsApp (logged)
//   DELETE ?email=EMAIL    → cancel a code (logged)
import crypto from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin, getAuthPayload } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { logAdmin } from "@/lib/admin-audit";
import { limitOr429 } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const denied = () => NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function GET(req) {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const sp = new URL(req.url).searchParams;
  const reveal = normEmail(sp.get("reveal"));
  const me = (await getAuthPayload())?.id;

  if (reveal) {
    const limited = limitOr429(`otp-reveal:${me}`, 60, 60 * 60 * 1000);
    if (limited) return limited;
    const { rows } = await query(`SELECT otp, otp_expiry, phone FROM otp_verification WHERE email = $1`, [reveal]);
    const r = rows[0];
    if (!r?.otp) return NextResponse.json({ error: "No code found for this email." }, { status: 404 });
    if (new Date(r.otp_expiry) < new Date()) return NextResponse.json({ error: "This code has expired — issue a new one.", expired: true }, { status: 410 });
    await logAdmin("otp.reveal", null, { email: reveal }, me);
    return NextResponse.json({ email: reveal, otp: r.otp, expires: r.otp_expiry, phone: r.phone });
  }

  // tidy: forget codes that expired more than 7 days ago
  await query(`DELETE FROM otp_verification WHERE otp_expiry < NOW() - INTERVAL '7 days'`).catch(() => {});

  const { rows } = await query(
    `SELECT o.email, o.phone, o.created_at, o.otp_expiry, COALESCE(o.delivery, 'unknown') AS delivery,
            (o.otp_expiry < NOW()) AS expired,
            EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = o.email) AS registered,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', am.first_name, am.last_name)), ''), au.email) AS issued_by
       FROM otp_verification o
       LEFT JOIN users au ON au.id = o.issued_by
       LEFT JOIN matrimony_profiles am ON am.user_id = o.issued_by
      ORDER BY o.created_at DESC NULLS LAST
      LIMIT 200`
  );
  const items = rows.map((r) => ({ ...r, status: r.registered ? "registered" : r.expired ? "expired" : "waiting" }));
  const counts = {
    waiting: items.filter((i) => i.status === "waiting").length,
    needsHelp: items.filter((i) => i.status === "waiting" && !["sent"].includes(i.delivery)).length,
  };
  return NextResponse.json({ items, counts });
}

export async function POST(req) {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const me = (await getAuthPayload())?.id;
  const limited = limitOr429(`otp-issue:${me}`, 60, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const email = normEmail(body.email);
  if (!validEmail(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const phone = String(body.phone || "").replace(/[^\d+]/g, "").slice(0, 15) || null;
  const minutes = Math.min(Math.max(parseInt(body.minutes, 10) || 30, 5), 24 * 60);

  const exists = await query(`SELECT 1 FROM users WHERE LOWER(email) = $1`, [email]);
  if (exists.rows.length) {
    return NextResponse.json({ error: "An account with this email already exists. They can log in or use “Forgot password”." }, { status: 400 });
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const { rows } = await query(
    `INSERT INTO otp_verification (email, phone, otp, otp_expiry, created_at, delivery, issued_by)
     VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval, NOW(), 'admin', $5)
     ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, otp_expiry = EXCLUDED.otp_expiry,
       phone = COALESCE(EXCLUDED.phone, otp_verification.phone), created_at = NOW(), delivery = 'admin', issued_by = EXCLUDED.issued_by
     RETURNING otp_expiry, phone`,
    [email, phone, otp, String(minutes), me]
  );
  await logAdmin("otp.issue", null, { email, minutes }, me);
  return NextResponse.json({ ok: true, email, otp, expires: rows[0].otp_expiry, phone: rows[0].phone });
}

export async function DELETE(req) {
  if (!(await isAdmin())) return denied();
  await ensureSchema();
  const email = normEmail(new URL(req.url).searchParams.get("email"));
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  const { rowCount } = await query(`DELETE FROM otp_verification WHERE email = $1`, [email]);
  if (!rowCount) return NextResponse.json({ error: "No code found." }, { status: 404 });
  await logAdmin("otp.cancel", null, { email });
  return NextResponse.json({ ok: true });
}
