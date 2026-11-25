import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { query } from "@/lib/db";
import { clientIp, limitOr429, rateLimit } from "@/lib/rate-limit";
import { signResetToken, RESET_TTL_MINUTES } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

// Same answer whether or not the account exists, so this endpoint can't be used
// to discover which emails are registered.
const GENERIC = {
  message: "If an account exists for this email, a reset link is on its way.",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function emailHtml(name, link) {
  return `
  <div style="background:#f6efe4;padding:32px 12px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #e8d7b0;border-radius:16px;overflow:hidden">
      <tr><td style="background:#5a0f22;padding:22px 28px;color:#e8cf8e;font-family:Georgia,serif;font-size:24px;font-weight:bold">MatriMoney</td></tr>
      <tr><td style="padding:28px;color:#2b1a1f;font-size:15px;line-height:1.6">
        <p style="margin:0 0 12px">Namaste ${esc(name)},</p>
        <p style="margin:0 0 20px">We received a request to reset your MatriMoney password. Click the button below to choose a new one.</p>
        <p style="margin:0 0 24px;text-align:center">
          <a href="${esc(link)}" style="display:inline-block;background:#c9a24a;color:#3b0a16;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:40px">Reset my password</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#6b5a5f">This link works once and expires in ${RESET_TTL_MINUTES} minutes.</p>
        <p style="margin:0;font-size:13px;color:#6b5a5f">Didn't ask for this? You can ignore this email — your password stays the same.</p>
      </td></tr>
    </table>
  </div>`;
}

export async function POST(request) {
  try {
    const ip = clientIp(request);
    const limited = limitOr429(`forgot-ip:${ip}`, 5, 15 * 60 * 1000,
      "Too many reset requests. Please try again in a few minutes.");
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // 3 links per address per hour (quietly) — stops anyone flooding a member's inbox
    if (!rateLimit(`forgot-email:${email}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json(GENERIC);
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("forgot: JWT_SECRET is not configured");
      return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
    }

    const { rows } = await query(
      "SELECT id, email, first_name, password_hash FROM users WHERE LOWER(email) = $1",
      [email]
    );
    const user = rows[0];
    if (!user) return NextResponse.json(GENERIC);

    const base = (process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const link = `${base}/matrimoney/reset-password?token=${encodeURIComponent(signResetToken(user))}`;

    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[RESET DEBUG] email not configured — reset link for ${email}: ${link}`);
        return NextResponse.json(GENERIC);
      }
      console.error("forgot: EMAIL_USER / EMAIL_PASS not configured");
      return NextResponse.json({ error: "Email service is unavailable. Please contact support." }, { status: 503 });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"MatriMoney Support" <${EMAIL_USER}>`,
        to: user.email,
        subject: "Reset your MatriMoney password",
        text: `Namaste ${user.first_name || ""},\n\nReset your password here (valid ${RESET_TTL_MINUTES} minutes, single use):\n${link}\n\nIf you didn't request this, ignore this email.`,
        html: emailHtml(user.first_name || "there", link),
      });
    } catch (mailErr) {
      console.error("forgot: sending email failed:", mailErr.message);
      if (process.env.NODE_ENV === "development") console.log(`[RESET DEBUG] reset link for ${email}: ${link}`);
      else return NextResponse.json({ error: "We couldn't send the email right now. Please try again shortly." }, { status: 502 });
    }

    return NextResponse.json(GENERIC);
  } catch (err) {
    console.error("Forgot password error:", err.message);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
