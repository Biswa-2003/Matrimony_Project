// src/app/api/change-password/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { validateStrongPassword } from "@/lib/password";
import { limitOr429 } from "@/lib/rate-limit";
import { revokeAllSessions, issueLoginToken, setLoginCookie } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json().catch(() => ({}));

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required." },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirm password do not match." },
        { status: 400 }
      );
    }
    // 🔒 Strong Password Check
    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Authenticate
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // 5 tries per 15 min per account — stops guessing the current password from a hijacked session
    const limited = limitOr429(`change-pw:${userId}`, 5, 15 * 60 * 1000,
      "Too many attempts. Please wait 15 minutes before trying again.");
    if (limited) return limited;

    const { rows } = await query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );
    if (!rows.length) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Your new password must be different from your current one." },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW(), password_changed_at = NOW() WHERE id = $2",
      [newHash, userId]
    );

    // every other device is logged out; this one gets a fresh session so the member stays signed in
    await revokeAllSessions(userId);
    const { rows: urows } = await query(
      `SELECT u.id, u.email, u.role, COALESCE(mp.first_name, u.first_name) AS first_name, mp.matri_id
         FROM users u LEFT JOIN matrimony_profiles mp ON mp.user_id = u.id WHERE u.id = $1`,
      [userId]
    );
    const { token } = await issueLoginToken(urows[0], req);
    return setLoginCookie(
      NextResponse.json({ message: "Password changed. You've been signed out on all other devices." }),
      token
    );
  } catch (err) {
    console.error("change-password error:", err);
    return NextResponse.json(
      { error: "Server error while changing password." },
      { status: 500 }
    );
  }
}
