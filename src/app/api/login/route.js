
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    // 🛡️ Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const isAllowed = rateLimit(ip, 5, 60 * 1000); // 5 attempts per minute
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { emailOrPhone, password } = await request.json();

    const identifier = emailOrPhone.trim().toLowerCase();
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

    // ✅ Successful Login: Reset failures & update last_login
    await query(
      `UPDATE users 
       SET failed_login_attempts = 0, 
           lock_until = NULL, 
           last_login_at = NOW() 
       WHERE id = $1`,
      [user.id]
    );

    // 🧾 Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.first_name,
        email: user.email,
        matri_id: user.matri_id,
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    // 🍪 Send token in cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          name: user.first_name,
          email: user.email,
          // matri_id: user.matri_id,
        },
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 2, // 2 hours
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    console.error("❌ Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
