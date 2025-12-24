
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { validateStrongPassword } from "@/lib/password"; // Import validator

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // 🛡️ Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(ip, 3, 60 * 60 * 1000)) { // 3 registrations per hour per IP
      return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();

    let {
      first_name,
      last_name,
      dob,
      gender,
      caste_id,   // numeric id if frontend already sends it
      caste,      // optional caste name, we will try to resolve id
      phone,
      mobile_no,  // from frontend field "mobile_no"
      email,
      password,
    } = body;

    // normalise phone
    const phoneNumber = phone || mobile_no || null;

    // basic validation
    if (!first_name || !last_name || !email || !password) {
      return NextResponse.json(
        { error: "Please fill all required fields." },
        { status: 400 }
      );
    }

    // 🔒 Strong Password Check
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // normalise email
    email = String(email).trim().toLowerCase();

    if (!email || email.length > 255) {
      return NextResponse.json(
        { error: "Email is required and must be less than 255 characters." },
        { status: 400 }
      );
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,63}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    // check if email already exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1",
      [email, phoneNumber]
    );
    if (existing.rows.length) {
      return NextResponse.json(
        { error: "User already exists with this email or phone." },
        { status: 409 }
      );
    }

    // 🔍 resolve caste_id from caste name if needed
    let finalCasteId = caste_id || null;
    if (!finalCasteId && caste) {
      const casteRes = await query(
        "SELECT id FROM castes WHERE LOWER(name) = LOWER($1) LIMIT 1",
        [caste]
      );
      if (casteRes.rows[0]) {
        finalCasteId = casteRes.rows[0].id;
      }
    }

    // 🔒 hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // user id
    const userId = uuidv4();

    // 1️⃣ Insert into users table
    // columns from your screenshot:
    // id | email | phone | password_hash | is_verified | role | created_at | updated_at | first_name | last_name
    await query(
      `
      INSERT INTO users (
        id,
        email,
        phone,
        password_hash,
        is_verified,
        role,
        created_at,
        updated_at,
        first_name,
        last_name
      )
      VALUES ($1, $2, $3, $4, false, 'user', NOW(), NOW(), $5, $6)
      `,
      [userId, email, phoneNumber, hashedPassword, first_name, last_name]
    );

    // 2️⃣ Insert into matrimony_profiles table
    // (columns you showed + what we used in advanced-search)
    const profileId = uuidv4();

    await query(
      `
      INSERT INTO matrimony_profiles (
        id,
        user_id,
        first_name,
        last_name,
        gender,
        dob,
        caste_id,
        marital_status,
        email_visible,
        phone_visible,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8,
        $9, $10, $11,
        NOW(), NOW()
      )
      `,
      [
        profileId,
        userId,
        first_name,
        last_name,
        gender || null,
        dob || null,
        finalCasteId,          // caste_id can be null if not resolved
        "Never Married",       // default marital status
        true,                  // email_visible
        true,                  // phone_visible
        true,                  // is_active
      ]
    );

    // ✅ Success
    return NextResponse.json(
      { message: "User registered successfully", userId },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Registration Error:", err);

    return NextResponse.json(
      { error: "Registration failed", details: err.message },
      { status: 500 }
    );
  }
}
