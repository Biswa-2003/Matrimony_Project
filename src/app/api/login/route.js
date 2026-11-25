
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { clientIp, limitOr429 } from "@/lib/rate-limit";
import { issueLoginToken, setLoginCookie } from "@/lib/sessions";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    // 🛡️ Rate limiting — per IP (own bucket). Per-account brute force is handled
    // below by the DB lockout (5 wrong passwords → 15 min lock).
    const limited = limitOr429(`login:${clientIp(request)}`, 10, 60 * 1000,
      "Too many login attempts. Please wait a minute and try again.");
    if (limited) return limited;

    const { emailOrPhone, password } = await request.json().catch(() => ({}));
    if (!emailOrPhone || !password) {
      return NextResponse.json({ error: "Please enter your email/phone and password." }, { status: 400 });
    }

    const identifier = String(emailOrPhone).trim().toLowerCase();
    // Logging removed for security

    // 🔍 Find user by email (case-insensitive) or mobile_no
    const result = await query(
      "SELECT * FROM users WHERE LOWER(email) = $1 OR phone = $1",
      [identifier]
    );

    if (result.rows.length === 0) {
      // Use generic error message to prevent username enumeration
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = result.rows[0];

    // 🔒 Check if account is locked
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
      return NextResponse.json(
        { error: `Account locked due to too many failed attempts. Try again in ${waitMinutes} minutes.` },
        { status: 403 }
      );
    }

    // 🔐 Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // ❌ Failed login: Increment attempts & possibly lock
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      let lockUpdate = "";

      if (newAttempts >= 5) {
        // Lock for 15 minutes
        lockUpdate = ", lock_until = NOW() + INTERVAL '15 minutes'";
      }

      await query(
        `UPDATE users SET failed_login_attempts = $1 ${lockUpdate} WHERE id = $2`,
        [newAttempts, user.id]
      );

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 🚫 Moderation: banned / suspended accounts can't sign in (checked only after the correct password)
    if (user.banned_at) {
      return NextResponse.json({ error: "This account has been closed for violating our community guidelines. Contact support if you think this is a mistake." }, { status: 403 });
    }
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      const until = new Date(user.suspended_until).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
      return NextResponse.json({ error: `This account is suspended until ${until}. Contact support if you need help.` }, { status: 403 });
    }

    // ✅ Successful Login: Reset failures & update last_login
    await query(
      `UPDATE users 
       SET failed_login_attempts = 0, 
           lock_until = NULL, 
           last_login_at = NOW() 
       WHERE id = $1`,
      [user.id]
    );

    // 🧾 Create a tracked session + signed token
    const { token } = await issueLoginToken(user, request);

    // 🍪 Send token in cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          name: user.first_name,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role || "user",
          must_change_password: Boolean(user.must_change_password),
        },
      },
      { status: 200 }
    );

    setLoginCookie(response, token);

    return response;
  } catch (err) {
    console.error("❌ Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
