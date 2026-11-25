import { query } from "../src/lib/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {
  // On a live server pass your own:  ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='Strong#Pass1' node --env-file=.env.production scripts/seed-admin.mjs
  const email = process.env.ADMIN_EMAIL || "admin@matrimony.com";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345!";
  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
    console.error("Refusing to use the default admin password in production. Set ADMIN_PASSWORD.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);

  const check = await query("SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1)", [email]);

  if (check.rows.length > 0) {
    await query("UPDATE users SET role = 'admin', is_verified = true, password_hash = $1 WHERE id = $2", [
      hash,
      check.rows[0].id,
    ]);
    console.log(`✅ Admin user updated: ${email}`);
  } else {
    const newId = crypto.randomUUID();
    // phone is unique: use ADMIN_PHONE, else 9999999999, else a free placeholder number
    let phone = process.env.ADMIN_PHONE || "9999999999";
    while ((await query("SELECT 1 FROM users WHERE phone = $1", [phone])).rows.length) {
      if (process.env.ADMIN_PHONE) throw new Error(`Phone ${phone} is already used by another account.`);
      phone = `99${crypto.randomInt(10000000, 100000000)}`;
    }
    await query(
      `INSERT INTO users (id, email, password_hash, role, is_verified, first_name, last_name, phone, created_at, updated_at)
       VALUES ($1, $2, $3, 'admin', true, 'System', 'Admin', $4, NOW(), NOW())`,
      [newId, email, hash, phone]
    );
    console.log("✅ Admin user created with ID:", newId);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding admin failed:", err);
  process.exit(1);
});
