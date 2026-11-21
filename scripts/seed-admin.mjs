import { query } from "../src/lib/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {
  const email = "admin@matrimony.com";
  const password = "Admin@12345!";
  const hash = await bcrypt.hash(password, 10);

  const check = await query("SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1)", [email]);

  if (check.rows.length > 0) {
    await query("UPDATE users SET role = 'admin', is_verified = true, password_hash = $1 WHERE id = $2", [
      hash,
      check.rows[0].id,
    ]);
    console.log("✅ Admin user updated: admin@matrimony.com / Admin@12345!");
  } else {
    const newId = crypto.randomUUID();
    await query(
      `INSERT INTO users (id, email, password_hash, role, is_verified, first_name, last_name, phone, created_at, updated_at)
       VALUES ($1, $2, $3, 'admin', true, 'System', 'Admin', '9999999999', NOW(), NOW())`,
      [newId, email, hash]
    );
    console.log("✅ Admin user created with ID:", newId);
  }

  // Also promote debug@example.com to admin if it exists
  await query("UPDATE users SET role = 'admin' WHERE email = 'debug@example.com'");
  console.log("✅ debug@example.com also granted admin role.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding admin failed:", err);
  process.exit(1);
});
