import { query } from "../src/lib/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {
  const email = "user@matrimony.com";
  const password = "User@12345!";
  const hash = await bcrypt.hash(password, 10);

  // 1. Check if user already exists
  const userCheck = await query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);

  let userId;
  if (userCheck.rows.length > 0) {
    userId = userCheck.rows[0].id;
    await query(
      `UPDATE users 
       SET password_hash = $1, 
           role = 'user', 
           is_verified = true, 
           first_name = 'Rahul', 
           last_name = 'Sharma', 
           phone = '9876543210', 
           failed_login_attempts = 0, 
           lock_until = NULL, 
           updated_at = NOW() 
       WHERE id = $2`,
      [hash, userId]
    );
    console.log("✅ Updated existing user:", email);
  } else {
    userId = crypto.randomUUID();
    await query(
      `INSERT INTO users (id, email, password_hash, role, is_verified, first_name, last_name, phone, created_at, updated_at)
       VALUES ($1, $2, $3, 'user', true, 'Rahul', 'Sharma', '9876543210', NOW(), NOW())`,
      [userId, email, hash]
    );
    console.log("✅ Created new user:", email, "with ID:", userId);
  }

  // 2. Profile for Rahul Sharma
  const profileCheck = await query("SELECT id FROM matrimony_profiles WHERE user_id = $1", [userId]);
  let profileId;

  if (profileCheck.rows.length > 0) {
    profileId = profileCheck.rows[0].id;
    await query(
      `UPDATE matrimony_profiles
       SET matri_id = 'MAT202601',
           first_name = 'Rahul',
           last_name = 'Sharma',
           gender = 'Male',
           marital_status = 'Never Married',
           dob = '1998-05-15',
           age_years = 28,
           height_cm = 178,
           weight_kg = 72,
           religion_id = 1,
           caste_id = 1,
           country_id = 1,
           state_id = 1,
           city_id = 1,
           is_active = true,
           is_verified = true,
           about_me = 'Passionate software engineer looking for a caring, cultured, and progressive life partner.',
           annual_income_inr = 1200000,
           job = 'Senior Software Engineer',
           college = 'IIT Bhubaneswar',
           updated_at = NOW()
       WHERE id = $1`,
      [profileId]
    );
    console.log("✅ Updated profile for Rahul Sharma");
  } else {
    profileId = crypto.randomUUID();
    await query(
      `INSERT INTO matrimony_profiles (
         id, user_id, matri_id, first_name, last_name, gender, marital_status,
         dob, age_years, height_cm, weight_kg, religion_id, caste_id,
         country_id, state_id, city_id, is_active, is_verified, about_me,
         annual_income_inr, job, college, created_at, updated_at
       ) VALUES (
         $1, $2, 'MAT202601', 'Rahul', 'Sharma', 'Male', 'Never Married',
         '1998-05-15', 28, 178, 72, 1, 1,
         1, 1, 1, true, true, 'Passionate software engineer looking for a caring, cultured, and progressive life partner.',
         1200000, 'Senior Software Engineer', 'IIT Bhubaneswar', NOW(), NOW()
       )`,
      [profileId, userId]
    );
    console.log("✅ Created profile for Rahul Sharma with ID:", profileId);
  }

  // 3. Attach primary photo to photos table
  await query("DELETE FROM photos WHERE profile_id = $1", [profileId]);
  const photoId = crypto.randomUUID();
  await query(
    `INSERT INTO photos (id, profile_id, path, is_primary, created_at)
     VALUES ($1, $2, '/uploads/bc10952a-0cac-4216-84d3-d98ad89dd24c-1756457769861-cropped.jpg', true, NOW())`,
    [photoId, profileId]
  );
  console.log("✅ Attached primary photo to profile");

  // 4. Grant active Gold subscription so test user has full access
  await query("DELETE FROM subscriptions WHERE user_id = $1", [userId]);
  const subId = crypto.randomUUID();
  await query(
    `INSERT INTO subscriptions (id, user_id, plan_id, starts_at, ends_at, remaining_contacts, created_at)
     VALUES ($1, $2, 1, NOW(), NOW() + INTERVAL '90 days', 75, NOW())`,
    [subId, userId]
  );
  console.log("✅ Granted 90-day active Gold Membership to test user");

  console.log("\n========================================");
  console.log("🎉 TEST USER CREDENTIALS READY:");
  console.log("   Email:    user@matrimony.com");
  console.log("   Password: User@12345!");
  console.log("   Role:     user");
  console.log("   Name:     Rahul Sharma (MAT202601)");
  console.log("========================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed test user:", err);
  process.exit(1);
});
