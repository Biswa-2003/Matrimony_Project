// src/app/api/profile/delete/route.js
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { reason } = await req.json();

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // optional: log reason somewhere
    await pool.query(
      `
      INSERT INTO user_delete_logs (user_id, reason, created_at)
      VALUES ($1, $2, NOW())
      `,
      [userId, reason || null]
    ).catch(() => { }); // ignore if table not present

    // delete profile first (FKs)
    await pool.query("DELETE FROM matrimony_profiles WHERE user_id = $1", [
      userId,
    ]);

    // finally delete user
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    return NextResponse.json({ message: "Profile deleted successfully." });
  } catch (err) {
    console.error("delete-profile error:", err);
    return NextResponse.json(
      { error: "Server error while deleting profile." },
      { status: 500 }
    );
  }
}
