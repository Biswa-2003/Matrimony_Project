import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { validateStrongPassword } from "@/lib/password";
import { clientIp, limitOr429 } from "@/lib/rate-limit";
import { verifyResetToken, maskEmail } from "@/lib/password-reset";
import { revokeAllSessions } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const LINK_ERRORS = {
  expired: { error: "This reset link has expired. Please request a new one.", reason: "expired" },
  invalid: { error: "This reset link is invalid or has already been used. Please request a new one.", reason: "invalid" },
};

/**
 * POST { token, check: true }        → { valid, email } (lets the page show "link expired" up front)
 * POST { token, password, confirm? } → sets the new password
 */
export async function POST(request) {
  try {
    const limited = limitOr429(`reset-ip:${clientIp(request)}`, 15, 15 * 60 * 1000,
      "Too many attempts. Please wait a few minutes and try again.");
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const { token, password, confirmPassword, check } = body;

    const v = await verifyResetToken(token);
    if (v.error) return NextResponse.json({ valid: false, ...LINK_ERRORS[v.error] }, { status: 400 });
    const { user } = v;

    if (check) return NextResponse.json({ valid: true, email: maskEmail(user.email) });

    const passwordError = validateStrongPassword(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    if (confirmPassword !== undefined && confirmPassword !== password) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    if (user.password_hash && (await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "Your new password must be different from your current one." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await ensureSchema();
    // Changing the hash also invalidates this link (it was signed with the old hash).
    // Clear any login lockout so the member can sign in straight away.
    await query(
      `UPDATE users
          SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW(),
              failed_login_attempts = 0, lock_until = NULL, must_change_password = false
        WHERE id = $2`,
      [hashed, user.id]
    );

    await revokeAllSessions(user.id); // anyone still logged in with the old password is signed out
    return NextResponse.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Reset password error:", err.message);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
