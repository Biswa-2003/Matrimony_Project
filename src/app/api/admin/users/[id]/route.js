import { NextResponse } from "next/server";
import { logAdmin } from "@/lib/admin-audit";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const { id } = await context.params;

    const userRes = await query(
      `
      SELECT 
        u.*,
        mp.*,
        mp.id AS profile_id,
        pht.photo_url,
        r.name AS religion_name,
        c.name AS caste_name,
        ci.name AS city_name,
        s.name AS state_name,
        co.name AS country_name,
        e.name AS education_name,
        p.name AS profession_name
      FROM users u
      LEFT JOIN matrimony_profiles mp ON u.id = mp.user_id
      LEFT JOIN LATERAL (
        SELECT path AS photo_url
        FROM photos ph
        WHERE ph.profile_id = mp.id
        ORDER BY ph.is_primary DESC, ph.created_at DESC
        LIMIT 1
      ) pht ON true
      LEFT JOIN religions r ON mp.religion_id = r.id
      LEFT JOIN castes c ON mp.caste_id = c.id
      LEFT JOIN cities ci ON mp.city_id = ci.id
      LEFT JOIN states s ON mp.state_id = s.id
      LEFT JOIN countries co ON mp.country_id = co.id
      LEFT JOIN educations e ON mp.education_id = e.id
      LEFT JOIN professions p ON mp.profession_id = p.id
      WHERE u.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Subscriptions
    const subsRes = await query(
      `
      SELECT s.*, p.name AS plan_name, p.code AS plan_code, p.price_inr
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
      ORDER BY s.ends_at DESC
      `,
      [id]
    );

    const user = userRes.rows[0];
    delete user.password_hash; // Don't expose hash
    // u.* and mp.* both have "id" (the profile's wins), so put the account id back
    user.id = id;

    return NextResponse.json({
      success: true,
      user,
      subscriptions: subsRes.rows,
    });
  } catch (err) {
    console.error("Admin GET user by ID error:", err);
    return NextResponse.json({ error: "Failed to fetch user details" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const updates = [];
    const params = [id];

    if (typeof body.is_verified === "boolean") {
      params.push(body.is_verified);
      await query(`UPDATE users SET is_verified = $2, updated_at = NOW() WHERE id = $1`, [id, body.is_verified]);
      await query(`UPDATE matrimony_profiles SET is_verified = $2, updated_at = NOW() WHERE user_id = $1`, [id, body.is_verified]);
    }

    if (typeof body.is_active === "boolean") {
      await query(`UPDATE matrimony_profiles SET is_active = $2, updated_at = NOW() WHERE user_id = $1`, [id, body.is_active]);
    }

    if (body.role && ["user", "admin"].includes(body.role)) {
      await query(`UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1`, [id, body.role]);
    }

    if (body.first_name || body.last_name) {
      await query(
        `UPDATE matrimony_profiles SET first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), updated_at = NOW() WHERE user_id = $1`,
        [id, body.first_name || null, body.last_name || null]
      );
    }

    await logAdmin("member.update", id, Object.fromEntries(Object.entries(body).filter(([k]) => ["is_verified", "is_active", "role"].includes(k))));
    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (err) {
    console.error("Admin PATCH user error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const { id } = await context.params;
    const who = await query(
      `SELECT u.email, mp.matri_id FROM users u LEFT JOIN matrimony_profiles mp ON mp.user_id = u.id WHERE u.id = $1`, [id]
    ).catch(() => ({ rows: [] }));
    // log before deleting so the record keeps who it was
    await logAdmin("member.delete", null, { user_id: id, matri_id: who.rows[0]?.matri_id || null });

    // Delete cascading references
    await query("DELETE FROM subscriptions WHERE user_id = $1", [id]).catch(() => {});
    await query("DELETE FROM partner_preferences WHERE user_id = $1", [id]).catch(() => {});
    await query("DELETE FROM matrimony_profiles WHERE user_id = $1", [id]);
    await query("DELETE FROM users WHERE id = $1", [id]);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Admin DELETE user error:", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
