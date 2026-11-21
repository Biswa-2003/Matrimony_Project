import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    // 1. Overall user counts
    const usersCountRes = await query("SELECT COUNT(*)::int AS count FROM users");
    const totalUsers = usersCountRes.rows[0]?.count || 0;

    // 2. Profile counts
    const profilesCountRes = await query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN is_active = true THEN 1 END)::int AS active,
        COUNT(CASE WHEN is_verified = true THEN 1 END)::int AS verified,
        COUNT(CASE WHEN is_verified = false OR is_verified IS NULL THEN 1 END)::int AS pending,
        COUNT(CASE WHEN LOWER(gender) = 'male' THEN 1 END)::int AS male,
        COUNT(CASE WHEN LOWER(gender) = 'female' THEN 1 END)::int AS female
      FROM matrimony_profiles
    `);
    const profileStats = profilesCountRes.rows[0] || {
      total: 0,
      active: 0,
      verified: 0,
      pending: 0,
      male: 0,
      female: 0,
    };

    // 3. Subscriptions & Revenue
    const subStatsRes = await query(`
      SELECT 
        COUNT(*)::int AS total_subscriptions,
        COUNT(CASE WHEN ends_at >= NOW() THEN 1 END)::int AS active_subscriptions,
        COALESCE(SUM(p.price_inr), 0)::bigint AS estimated_revenue
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
    `);
    const subStats = subStatsRes.rows[0] || {
      total_subscriptions: 0,
      active_subscriptions: 0,
      estimated_revenue: 0,
    };

    // 4. Plans breakdown
    const plansRes = await query(`
      SELECT p.name, p.code, p.price_inr, COUNT(s.id)::int AS subscribers
      FROM plans p
      LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.ends_at >= NOW()
      GROUP BY p.id, p.name, p.code, p.price_inr
      ORDER BY p.price_inr ASC
    `);

    // 5. Recent registered users
    const recentUsersRes = await query(`
      SELECT 
        u.id, 
        u.email, 
        u.phone, 
        u.role, 
        u.is_verified, 
        u.created_at,
        mp.matri_id,
        mp.first_name,
        mp.last_name,
        mp.gender,
        pht.photo_url,
        mp.is_active AS profile_active
      FROM users u
      LEFT JOIN matrimony_profiles mp ON u.id = mp.user_id
      LEFT JOIN LATERAL (
        SELECT path AS photo_url
        FROM photos ph
        WHERE ph.profile_id = mp.id
        ORDER BY ph.is_primary DESC, ph.created_at DESC
        LIMIT 1
      ) pht ON true
      ORDER BY u.created_at DESC
      LIMIT 8
    `);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalProfiles: profileStats.total,
        activeProfiles: profileStats.active,
        verifiedProfiles: profileStats.verified,
        pendingVerifications: profileStats.pending,
        maleProfiles: profileStats.male,
        femaleProfiles: profileStats.female,
        activeSubscriptions: subStats.active_subscriptions,
        totalSubscriptions: subStats.total_subscriptions,
        estimatedRevenue: Number(subStats.estimated_revenue),
      },
      plans: plansRes.rows,
      recentUsers: recentUsersRes.rows,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Failed to load admin stats" }, { status: 500 });
  }
}
