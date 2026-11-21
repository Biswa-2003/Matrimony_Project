import { query } from "../src/lib/db.js";

async function main() {
  await query(`
    ALTER TABLE matrimony_profiles 
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
  `);
  console.log("✅ Column is_verified ensured on matrimony_profiles");

  // Sync users.is_verified to matrimony_profiles.is_verified
  await query(`
    UPDATE matrimony_profiles mp
    SET is_verified = u.is_verified
    FROM users u
    WHERE mp.user_id = u.id AND u.is_verified = true;
  `);
  console.log("✅ Synced is_verified status");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
