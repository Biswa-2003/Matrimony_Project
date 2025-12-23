import { NextResponse } from "next/server";
import pool from "@/lib/db";
import nodemailer from "nodemailer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email, phone } = await req.json();
    console.log("📨 Email received:", email, "phone:", phone);

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    console.log("🔐 Generated OTP:", otp);

    // 1) Store in DB
    const insertQuery = `
      INSERT INTO otp_verification (email, phone, otp, otp_expiry)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET 
        phone      = EXCLUDED.phone,
        otp        = EXCLUDED.otp,
        otp_expiry = EXCLUDED.otp_expiry
    `;
    await pool.query(insertQuery, [email, phone || null, otp, expiry]);
    console.log("✅ OTP stored in DB");

    // 2) Send Mail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      requireTLS: true,
      secured: true, // For SonarQube compliance
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Matrimony OTP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP is:</p><h2>${otp}</h2><p>Valid for 15 minutes.</p>`,
    });

    console.log("📤 Email sent successfully:", info.messageId);

    return NextResponse.json({ message: "OTP sent to your email." });
  } catch (err) {
    console.error("❌ OTP API Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
