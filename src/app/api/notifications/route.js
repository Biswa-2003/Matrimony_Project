import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

async function getUserId() {
  const c = await cookies();
  const token =
    c.get("token")?.value || c.get("auth_token")?.value || c.get("auth")?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    return d?.id ?? d?.userId ?? null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  const meId = await getUserId();
  if (!meId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch pending interests (received) from last 30 days
    const interestsSql = `
      SELECT 
        i.id, 
        i.created_at as timestamp, 
        'interest' as type,
        mp.matri_id,
        COALESCE(mp.first_name, mp.last_name, 'Member') as name,
        ph.path as photo_path
      FROM interests i
      JOIN matrimony_profiles mp ON mp.user_id = i.from_profile
      LEFT JOIN LATERAL (
        SELECT path FROM photos ph 
        WHERE ph.profile_id = mp.id 
        ORDER BY ph.is_primary DESC, ph.created_at DESC 
        LIMIT 1
      ) ph ON TRUE
      WHERE i.to_profile = $1 
        AND i.status = 'sent'
        AND i.created_at > NOW() - INTERVAL '30 days'
      ORDER BY i.created_at DESC
      LIMIT 10
    `;

    // 2. Fetch accepted interests (where I SENT and THEY ACCEPTED)
    const acceptedSql = `
      SELECT 
        i.id, 
        i.updated_at as timestamp, 
        'accepted' as type,
        mp.matri_id,
        COALESCE(mp.first_name, mp.last_name, 'Member') as name,
        ph.path as photo_path
      FROM interests i
      JOIN matrimony_profiles mp ON mp.user_id = i.to_profile
      LEFT JOIN LATERAL (
        SELECT path FROM photos ph 
        WHERE ph.profile_id = mp.id 
        ORDER BY ph.is_primary DESC, ph.created_at DESC 
        LIMIT 1
      ) ph ON TRUE
      WHERE i.from_profile = $1 
        AND i.status = 'accepted'
        AND i.updated_at > NOW() - INTERVAL '30 days'
      ORDER BY i.updated_at DESC
      LIMIT 10
    `;

    // 3. Fetch profile views from last 7 days
    const viewsSql = `
      SELECT 
        v.id, 
        v.viewed_at as timestamp, 
        'view' as type,
        mp.matri_id,
        COALESCE(mp.first_name, mp.last_name, 'Member') as name,
        ph.path as photo_path
      FROM profile_views v
      JOIN matrimony_profiles mp ON mp.user_id = v.viewer_id
      LEFT JOIN LATERAL (
        SELECT path FROM photos ph 
        WHERE ph.profile_id = mp.id 
        ORDER BY ph.is_primary DESC, ph.created_at DESC 
        LIMIT 1
      ) ph ON TRUE
      WHERE v.viewed_id = $1
        AND v.viewed_at > NOW() - INTERVAL '7 days'
      ORDER BY v.viewed_at DESC
      LIMIT 10
    `;

    const [intRes, accRes, viewRes] = await Promise.all([
      query(interestsSql, [meId]),
      query(acceptedSql, [meId]),
      query(viewsSql, [meId])
    ]);

    const notifications = [
      ...(intRes.rows || []),
      ...(accRes.rows || []),
      ...(viewRes.rows || [])
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 15); // keep top 15 combined

    // Simple count of "unread" (just total items for now as we don't have read status)
    const count = notifications.length;

    return NextResponse.json({ ok: true, count, notifications });
  } catch (e) {
    console.error("Notifications error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
