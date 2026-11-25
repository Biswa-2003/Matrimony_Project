// src/app/api/profile/visibility/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

import { clientIp, limitOr429 } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function POST(req) {
  { const limited = limitOr429(`profile-settings:${clientIp(req)}`, 20, 10 * 60 * 1000); if (limited) return limited; }
  try {
    const { visibility } = await req.json(); // "all" | "members"

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await query(
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
