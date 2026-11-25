// Admin: help a member who forgot their password (e.g. their email doesn't receive mail).
//   POST { mode: "link" }                 → one-time reset link (30 min). The admin never sees the password.
//   POST { mode: "temp", password? }      → temporary password (generated if not given). The member must
//                                           choose a new one at their next sign-in.
// Both: logged in the admin audit, all the member's devices are signed out, and the member is emailed.
// Admin accounts can't be reset here - admins change their own password under Login & Security.
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin, getAuthPayload } from "@/lib/auth";
import { ensureSchema } from "@/lib/schema";
import { logAdmin } from "@/lib/admin-audit";
import { limitOr429 } from "@/lib/rate-limit";
import { validateStrongPassword } from "@/lib/password";
import { signResetToken, RESET_TTL_MINUTES } from "@/lib/password-reset";
import { revokeAllSessions } from "@/lib/sessions";
import { sendMail, layout, esc, siteUrl } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Readable temporary password that always passes the strong-password rules, e.g. "Rose-4827-Kite#". */
function tempPassword() {
  const words = ["Rose", "Lotus", "Kite", "Moon", "Pearl", "River", "Mango", "Star", "Silk", "Diya", "Tulip", "Coral"];
  const pick = () => words[crypto.randomInt(words.length)];
  return `${pick()}-${crypto.randomInt(1000, 10000)}-${pick()}${"#@$%&*"[crypto.randomInt(6)]}`;
}

function noticeEmail(firstName, how) {
  const body = `<p>Hello ${esc(firstName || "there")},</p>
    <p>At your request, our support team ${how} for your MatriMoney account. You have been signed out on all devices.</p>
    <p><strong>Didn't ask for this?</strong> Reply to this email or contact support right away.</p>`;
  return layout({
    preheader: "Your MatriMoney password was reset by our support team",
    title: "Your password was reset",
    body,
    cta: { href: `${siteUrl()}/matrimoney/login`, label: "Sign in" },
  });
}

export async function POST(req, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
  const adminId = (await getAuthPayload())?.id;
  const limited = limitOr429(`admin-pw:${adminId}`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const { id } = await params;
  if (!UUID.test(String(id))) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  await ensureSchema();

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "temp" ? "temp" : body.mode === "link" ? "link" : null;
  if (!mode) return NextResponse.json({ error: "Choose a reset link or a temporary password." }, { status: 400 });

  const { rows } = await query(`SELECT id, email, phone, role, first_name, password_hash FROM users WHERE id = $1`, [id]);
  const user = rows[0];
  if (!user) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if (user.role === "admin") {
    return NextResponse.json(
      { error: "Admin passwords can't be reset here. The admin can change it under Login & Security." },
      { status: 400 }
    );
  }

  if (mode === "link") {
    // single use: the link stops working as soon as the password changes
    const url = `${siteUrl()}/matrimoney/reset-password?token=${encodeURIComponent(signResetToken(user))}`;
    await logAdmin("password.reset_link", user.id, { email: user.email }, adminId);
    return NextResponse.json({
      ok: true,
      mode,
      url,
      minutes: RESET_TTL_MINUTES,
      member: { name: user.first_name, email: user.email, phone: user.phone },
    });
  }

  const password = body.password ? String(body.password) : tempPassword();
  const weak = validateStrongPassword(password);
  if (weak) return NextResponse.json({ error: weak }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  await query(
    `UPDATE users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW(),
            failed_login_attempts = 0, lock_until = NULL, must_change_password = true
      WHERE id = $2`,
    [hash, user.id]
  );
  await revokeAllSessions(user.id);
  await logAdmin("password.temp_set", user.id, { email: user.email }, adminId);
  await sendMail({
    to: user.email,
    subject: "Your MatriMoney password was reset",
    html: noticeEmail(user.first_name, "set a temporary password"),
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    mode,
    password,
    member: { name: user.first_name, email: user.email, phone: user.phone },
  });
}
