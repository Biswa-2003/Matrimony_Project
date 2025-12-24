import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { duration } = await req.json(); // "15d" | "1m" | null

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let until = null;
    if (duration === "15d") {
      until = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    } else if (duration === "1m") {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      until = d;
    }

    await pool.query(
      `
      UPDATE matrimony_profiles
      SET is_active = false,
          deactivate_until = $1,
          updated_at = NOW()
      WHERE user_id = $2
      `,
      [until, userId]
    );

    return NextResponse.json({ message: "Profile deactivated." });
  } catch (err) {
    console.error("deactivate error:", err);
    return NextResponse.json(
      { error: "Server error while deactivating profile." },
      { status: 500 }
    );
  }
}
