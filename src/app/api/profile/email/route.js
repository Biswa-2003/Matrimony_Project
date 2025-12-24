// src/app/api/profile/email/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email || email.length > 255) {
      return NextResponse.json(
        { error: "Email is required and must be less than 255 characters." },
        { status: 400 }
      );
    }
    // Improved regex: anchored and bounded to prevent ReDoS
    const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,63}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await pool.query(
      "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2",
      [email, userId]
    );

    return NextResponse.json({ message: "Email updated successfully." });
  } catch (err) {
    console.error("update-email error:", err);
    return NextResponse.json(
      { error: "Server error while updating email." },
      { status: 500 }
    );
  }
}
