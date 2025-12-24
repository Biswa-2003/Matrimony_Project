import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required." },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      `SELECT otp, otp_expiry 
       FROM otp_verification 
       WHERE email = $1`,
      [email]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "No OTP found for this email. Please request a new one." },
        { status: 400 }
      );
    }

    const row = rows[0];
    const now = new Date();

    if (row.otp_expiry < now) {
      return NextResponse.json(
        { message: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (row.otp !== otp) {
      return NextResponse.json(
        { message: "Invalid OTP." },
        { status: 400 }
      );
    }

    // success → you can delete the OTP so it can't be reused
    await pool.query(`DELETE FROM otp_verification WHERE email = $1`, [email]);

    return NextResponse.json({ message: "OTP verified successfully." });
  } catch (err) {
    console.error("❌ Verify OTP API Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
