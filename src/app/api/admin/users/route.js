import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const gender = (searchParams.get("gender") || "").trim();
    const role = (searchParams.get("role") || "").trim();
    const verified = searchParams.get("verified");
    const active = searchParams.get("active");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(
        u.email ILIKE $${idx} OR 
        u.phone ILIKE $${idx} OR 
        mp.first_name ILIKE $${idx} OR 
        mp.last_name ILIKE $${idx} OR 
        mp.matri_id ILIKE $${idx}
      )`);
    }

    if (gender) {
      params.push(gender);
      conditions.push(`LOWER(mp.gender) = LOWER($${params.length})`);
    }

    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }

    if (verified === "true") {
      conditions.push(`(u.is_verified = true OR mp.is_verified = true)`);
    } else if (verified === "false") {
      conditions.push(`(u.is_verified = false OR u.is_verified IS NULL)`);
    }

    if (active === "true") {
      conditions.push(`mp.is_active = true`);
    } else if (active === "false") {
      conditions.push(`mp.is_active = false`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query(
      `
      SELECT COUNT(*)::int AS total
      FROM users u
      LEFT JOIN matrimony_profiles mp ON u.id = mp.user_id
      ${whereClause}
      `,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const usersRes = await query(
      `
      SELECT 
        u.id,
        u.email,
        u.phone,
        u.role,
        u.is_verified,
        u.created_at,
        u.last_login_at,
        mp.id AS profile_id,
        mp.matri_id,
        mp.first_name,
        mp.last_name,
        mp.gender,
        mp.age_years,
        mp.height_cm,
        pht.photo_url,
        mp.is_active,
        mp.religion_id,
        mp.caste_id,
        mp.city_id,
        r.name AS religion_name,
        c.name AS caste_name,
        ci.name AS city_name,
        sub.plan_name,
        sub.ends_at AS sub_ends_at
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
      LEFT JOIN LATERAL (
        SELECT p.name AS plan_name, s.ends_at
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = u.id AND s.ends_at >= NOW()
        ORDER BY s.ends_at DESC
        LIMIT 1
      ) sub ON true
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `,
      params
    );

    return NextResponse.json({
      success: true,
      total,
      limit,
      offset,
      users: usersRes.rows,
    });
  } catch (err) {
    console.error("Admin GET users error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, role = "user", firstName, lastName, phone, gender = "Male" } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const check = await query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    if (check.rows.length > 0) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await query(
      `
      INSERT INTO users (id, email, password_hash, role, is_verified, first_name, last_name, phone, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, $5, $6, $7, NOW(), NOW())
      `,
      [userId, email, hash, role, firstName || null, lastName || null, phone || null]
    );

    // Optionally create profile
    const profileId = crypto.randomUUID();
    const matriId = `MAT${Math.floor(100000 + Math.random() * 900000)}`;

    await query(
      `
      INSERT INTO matrimony_profiles (id, user_id, matri_id, first_name, last_name, gender, is_active, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW())
      `,
      [profileId, userId, matriId, firstName || "New", lastName || "User", gender]
    );

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: { id: userId, email, role, matri_id: matriId },
    });
  } catch (err) {
    console.error("Admin POST users error:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
