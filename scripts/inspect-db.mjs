import { query } from "../src/lib/db.js";

async function main() {
  const tables = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("TABLES:", tables.rows.map((r) => r.table_name));

  for (const table of ["users", "matrimony_profiles", "plans", "subscriptions"]) {
    const cols = await query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [table]
    );
    console.log(`\nCOLUMNS FOR ${table}:`);
    console.table(cols.rows);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
