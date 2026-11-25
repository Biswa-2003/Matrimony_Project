// src/app/api/profile/privacy/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";

import { clientIp, limitOr429 } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { rows } = await query(
      `
      SELECT u.phone, mp.parent_phone, mp.photo_locked,
             COALESCE(mp.phone_visible, false) AS phone_visible, COALESCE(mp.email_visible, false) AS email_visible
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
      showPhone: !!user.phone_visible,
      showEmail: !!user.email_visible,
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
  { const limited = limitOr429(`profile-settings:${clientIp(req)}`, 20, 10 * 60 * 1000); if (limited) return limited; }
  try {
    const { primaryNumber, parentNumber, photoLocked, showPhone, showEmail } = await req.json();

    const userId = await getUserIdFromCookie();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    if (typeof showPhone === "boolean" || typeof showEmail === "boolean") {
      await query(
        `UPDATE matrimony_profiles
            SET phone_visible = COALESCE($1, phone_visible), email_visible = COALESCE($2, email_visible), updated_at = NOW()
          WHERE user_id = $3`,
        [typeof showPhone === "boolean" ? showPhone : null, typeof showEmail === "boolean" ? showEmail : null, userId]
      );
    }

    // Update users.phone and matrimony_profiles.phone_parent, photo_locked
    await query(
      `
      UPDATE users SET phone = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [primaryNumber || null, userId]
    );

    await query(
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
