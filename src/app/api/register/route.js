
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
    const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
    if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) { // 10 sign-up attempts per hour per IP
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

    // 📱 Indian mobile number (optional +91 / 0 prefix, 10 digits starting 6-9)
    if (phoneNumber) {
      const digits = String(phoneNumber).replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
      if (!/^[6-9]\d{9}$/.test(digits)) {
        return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
      }
    }

    // 🎂 Legal marriageable age in India: 21 (groom), 18 (bride)
    if (dob) {
      const birth = new Date(dob);
      if (Number.isNaN(birth.getTime())) {
        return NextResponse.json({ error: "Please enter a valid date of birth." }, { status: 400 });
      }
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      const minAge = String(gender || "").toLowerCase() === "male" ? 21 : 18;
      if (age < minAge || age > 100) {
        return NextResponse.json(
          { error: `Grooms must be at least 21 and brides at least 18 years old to register.` },
          { status: 400 }
        );
      }
    }

    // ✉️ Email OTP — enforced whenever the server can actually send email
    const otpRequired = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS) || process.env.REQUIRE_EMAIL_OTP === "true";
    if (otpRequired) {
      const otp = String(body.otp || "").trim();
      if (!otp) {
        return NextResponse.json({ error: "Please verify your email with the OTP we sent." }, { status: 400 });
      }
      // at most 5 OTP guesses per email per 15 min — stops brute-forcing the 6-digit code
      if (!rateLimit(`register-otp:${email}`, 5, 15 * 60 * 1000)) {
        await query("DELETE FROM otp_verification WHERE email = $1", [email]);
        return NextResponse.json({ error: "Too many wrong codes. Please request a new OTP in 15 minutes." }, { status: 429 });
      }
      const otpRes = await query("SELECT otp, otp_expiry FROM otp_verification WHERE email = $1", [email]);
      const row = otpRes.rows[0];
      if (!row || row.otp !== otp) {
        return NextResponse.json({ error: "Invalid OTP. Please check the code and try again." }, { status: 400 });
      }
      if (new Date(row.otp_expiry) < new Date()) {
        return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
      }
      await query("DELETE FROM otp_verification WHERE email = $1", [email]);
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
    const { newMatriId } = await import("@/lib/members");
    const matriId = await newMatriId(); // public profile id — every profile needs one to be viewable

    await query(
      `
      INSERT INTO matrimony_profiles (
        id,
        user_id,
        matri_id,
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
        $1, $2, $12, $3, $4, $5,
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
        matriId,               // $12
      ]
    );

    // ✅ Success
    // invited by a friend? (?ref=CODE on any page stores an mm_ref cookie for 30 days)
    const refCode = (req.headers.get("cookie") || "").match(/(?:^|;\s*)mm_ref=([A-Za-z0-9]{4,12})/)?.[1];
    if (refCode) {
      const { recordReferral } = await import("@/lib/referrals");
      await recordReferral(userId, refCode);
    }

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
