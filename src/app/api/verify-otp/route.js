import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { clientIp, limitOr429, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const limited = limitOr429(`verify-otp-ip:${clientIp(req)}`, 20, 15 * 60 * 1000);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and OTP are required." }, { status: 400 });
    }

    // 5 guesses per email per 15 minutes; after that the code is burned.
    if (!rateLimit(`verify-otp:${email}`, 5, 15 * 60 * 1000)) {
      await query(`DELETE FROM otp_verification WHERE email = $1`, [email]);
      return NextResponse.json(
        { message: "Too many wrong attempts. Please request a new OTP." },
        { status: 429 }
      );
    }

    const { rows } = await query(
      `SELECT otp, otp_expiry FROM otp_verification WHERE email = $1`,
      [email]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "No OTP found for this email. Please request a new one." },
        { status: 400 }
      );
    }

    const row = rows[0];
    if (new Date(row.otp_expiry) < new Date()) {
      return NextResponse.json({ message: "OTP has expired. Please request a new one." }, { status: 400 });
    }
    if (row.otp !== otp) {
      return NextResponse.json({ message: "Invalid OTP." }, { status: 400 });
    }

    // success → delete so it can't be reused
    await query(`DELETE FROM otp_verification WHERE email = $1`, [email]);
    return NextResponse.json({ message: "OTP verified successfully." });
  } catch (err) {
    console.error("Verify OTP API Error:", err.message);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
