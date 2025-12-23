import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export async function POST(request) {
  try {
    const body = await request.json();

    // 1. Validate email input
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 2. Validate environment variables
    const JWT_SECRET = process.env.JWT_SECRET;
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;

    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!BASE_URL) {
      console.error("NEXT_PUBLIC_BASE_URL is not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!EMAIL_USER || !EMAIL_PASS) {
      console.error("Email credentials not configured");
      return NextResponse.json({ error: "Email service unavailable" }, { status: 500 });
    }

    // 3. Check if user exists (use specific columns instead of *)
    const result = await query(
      "SELECT id, email, first_name, last_name FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];

    // 4. Handle user name safely with fallback
    const userName = user.first_name || user.last_name
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
      : "there";

    // Create token (valid for 15 minutes)
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `${BASE_URL}/matrimoney/reset-password?token=${token}`;

    // 5. Send email using Nodemailer (removed invalid 'secured' option)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      requireTLS: true,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Matrimony Support" <${EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - Matrimony",
      html: `
        <p>Hello ${userName},</p>
        <p>You requested a password reset. Click below to reset:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    return NextResponse.json({ message: "Reset link sent to email." }, { status: 200 });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
