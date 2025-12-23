// src/app/api/profile/visibility/route.js
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { visibility } = await req.json(); // "all" | "members"

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await pool.query(
      `
      UPDATE matrimony_profiles
      SET profile_visibility = $1, updated_at = NOW()
      WHERE user_id = $2
      `,
      [visibility, userId]
    );

    return NextResponse.json({ message: "Profile visibility updated." });
  } catch (err) {
    console.error("visibility error:", err);
    return NextResponse.json(
      { error: "Server error while updating visibility." },
      { status: 500 }
    );
  }
}
