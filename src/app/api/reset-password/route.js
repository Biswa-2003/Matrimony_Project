import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { validateStrongPassword } from "@/lib/password";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    // 1. Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // 🔒 Strong Password Check
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Update in DB with changed_at timestamp
    await query("UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2", [
      hashedPassword,
      userId,
    ]);

    return NextResponse.json({ message: "Password reset successful." }, { status: 200 });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
}
