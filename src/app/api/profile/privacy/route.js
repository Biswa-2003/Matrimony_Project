// src/app/api/profile/privacy/route.js
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { rows } = await pool.query(
      `
      SELECT u.phone, mp.parent_phone, mp.photo_locked
      FROM users u
      LEFT JOIN matrimony_profiles mp ON u.id = mp.user_id
      WHERE u.id = $1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = rows[0];

    return NextResponse.json({
      primaryNumber: user.phone || "",
      parentNumber: user.parent_phone || "",
      photoLocked: !!user.photo_locked,
    });
  } catch (err) {
    console.error("Error fetching privacy settings:", err);
    return NextResponse.json(
      { error: "Server error while fetching privacy settings." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { primaryNumber, parentNumber, photoLocked } = await req.json();

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // Update users.phone and matrimony_profiles.phone_parent, photo_locked
    await pool.query(
      `
      UPDATE users SET phone = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [primaryNumber || null, userId]
    );

    await pool.query(
      `
      UPDATE matrimony_profiles
      SET parent_phone = $1,
          photo_locked = $2,
          mobile       = $3,
          updated_at   = NOW()
      WHERE user_id = $4
      `,
      [parentNumber || null, !!photoLocked, primaryNumber || null, userId]
    );

    return NextResponse.json({ message: "Privacy settings saved." });
  } catch (err) {
    console.error("privacy error:", err);
    return NextResponse.json(
      { error: "Server error while saving privacy." },
      { status: 500 }
    );
  }
}
