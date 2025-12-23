// src/app/api/profile/call-preference/route.js
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { callPreference } = await req.json(); // "1", "3", "6", "never"

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await pool.query(
      `
      INSERT INTO user_preferences (user_id, call_preference)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET call_preference = EXCLUDED.call_preference
      `,
      [userId, callPreference]
    );

    return NextResponse.json({ message: "Call preference saved." });
  } catch (err) {
    console.error("call-preference error:", err);
    return NextResponse.json(
      { error: "Server error while saving call preference." },
      { status: 500 }
    );
  }
}
